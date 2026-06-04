import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { requireAuth, getUserFromRequest } from './auth';
import { globalWorkflow } from './workflow';
import { assistant } from './nodes';
import { AnyEvent, EventEnvelope, EventType, createInvokeContext } from './types';
import { routeNotionWebhookToLangGraph } from './notionRouter';

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3006;
const upload = multer({ storage: multer.memoryStorage() });
const apiKey = process.env.API_KEY || 'dev-api-key';

// Persistence for the UI stream
const eventHistory: AnyEvent[] = [];
globalWorkflow.subscribeToAll(({ event }) => {
  eventHistory.push(event);
  if (eventHistory.length > 500) eventHistory.shift();
});

app.use(cors());
app.use(
  express.json({
    verify: (req, _res, buf) => {
      // Capture raw body for signature verification (e.g., Notion webhooks)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

app.get('/api/me', requireAuth(), (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.json({ user: (req as any).user });
});

app.get('/api/events', requireAuth(), (_req, res) => {
  res.json({ events: eventHistory });
});

app.get('/api/stream', (req, res) => {
  const user = getUserFromRequest(req, true);
  if (!user) {
    return res.status(401).end();
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event: AnyEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // Send history
  eventHistory.forEach(sendEvent);

  const unsubscribe = globalWorkflow.subscribeToAll(({ event }) => {
    sendEvent(event);
  });

  req.on('close', () => {
    unsubscribe();
  });
});

app.post('/api/chat/message', requireAuth(), async (req, res) => {
  const { text, conversationId } = req.body as { text?: string; conversationId?: string };
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Message text required' });
  }

  const anthropicKey = req.header('x-anthropic-key');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (req as any).user;
  
  // Hand off to the Graphite Assistant
  const result = await assistant.handleUserMessage(user.id, text, conversationId, anthropicKey);
  res.json(result);
});

// Helper for emitting external events (webhooks) into the Graphite workflow
const emitWebhookEvent = <T extends EventType>(
  type: T,
  payload: any,
  actor: string,
  source: string
) => {
  const context = createInvokeContext(actor); // Generic context for webhooks
  const evt: AnyEvent = {
    id: uuid(),
    type,
    createdAt: Date.now(),
    actor,
    source,
    context,
    payload,
  };

  globalWorkflow.getTopic(type).publish(evt);
  return evt;
};

app.post('/api/webhooks/email', (req, res) => {
  const { from, subject, body } = req.body as { from?: string; subject?: string; body?: string };
  if (!from || !subject) return res.status(400).json({ error: 'from and subject required' });

  const evt = emitWebhookEvent('webhook.email', { from, subject, body: body || '' }, from, 'email-webhook');
  res.json({ received: true, eventId: evt.id });
});

app.post('/api/webhooks/notion', async (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawBody: Buffer | undefined = (req as any).rawBody;
  const signatureHeader = req.header('X-Notion-Signature') || '';
  const configuredVerificationToken = process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN || '';
  const ideasDatabaseId = process.env.NOTION_IDEAS_DATABASE_ID;

  // Notion sends a one-time verification payload containing "verification_token"
  const maybeVerificationToken =
    req.body && typeof req.body === 'object' ? (req.body as any).verification_token : undefined;

  if (typeof maybeVerificationToken === 'string' && maybeVerificationToken.length > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `[notion-webhook] received verification_token (store as NOTION_WEBHOOK_VERIFICATION_TOKEN): ${maybeVerificationToken}`
    );

    const evt = emitWebhookEvent(
      'webhook.notion.verification',
      {
        verification_token: maybeVerificationToken,
        receivedAt: Date.now(),
      },
      'notion',
      'notion-webhook'
    );

    return res.json({ received: true, eventId: evt.id });
  }

  const computeExpectedSignature = (secret: string, body: Buffer) => {
    const digest = crypto.createHmac('sha256', secret).update(body).digest('hex');
    return `sha256=${digest}`;
  };

  const timingSafeEqual = (a: string, b: string) => {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  };

  let verified = false;
  if (configuredVerificationToken) {
    if (!signatureHeader) {
      return res.status(401).json({ error: 'Missing X-Notion-Signature header' });
    }
    if (!rawBody) {
      return res.status(500).json({ error: 'Server misconfigured: raw body missing' });
    }
    const expected = computeExpectedSignature(configuredVerificationToken, rawBody);
    verified = timingSafeEqual(expected, signatureHeader);
    if (!verified) {
      return res.status(401).json({ error: 'Invalid Notion webhook signature' });
    }
  } else {
    // eslint-disable-next-line no-console
    console.log(
      '[notion-webhook] NOTION_WEBHOOK_VERIFICATION_TOKEN not set; accepting webhook without signature verification'
    );
  }

  const evt = emitWebhookEvent(
    'webhook.notion',
    {
      verified,
      headers: {
        'x-notion-signature': signatureHeader || undefined,
      },
      body: req.body,
      receivedAt: Date.now(),
    },
    'notion',
    'notion-webhook'
  );

  // Route Ideas DB page updates into the LangGraph chat
  await routeNotionWebhookToLangGraph(req.body, { assistant, ideasDatabaseId });

  res.json({ received: true, verified, eventId: evt.id });
});

app.post('/api/webhooks/sms', (req, res) => {
  const { from, body } = req.body as { from?: string; body?: string };
  if (!from || !body) return res.status(400).json({ error: 'from and body required' });

  const evt = emitWebhookEvent('webhook.sms', { from, body }, from, 'sms-webhook');
  res.json({ received: true, eventId: evt.id });
});

app.post('/api/upload', requireAuth(), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required' });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (req as any).user;
  const evt = emitWebhookEvent('file.uploaded', {
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  }, user.name, 'chat-ui');

  res.json({ event: evt });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`MarketSense Graphite-Backend running on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Use API key: ${apiKey}`);
});
