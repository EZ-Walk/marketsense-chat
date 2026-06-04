export interface LangGraphChatLike {
  handleUserMessage(
    userId: string,
    text: string,
    conversationId?: string,
    anthropicKey?: string
  ): Promise<unknown> | unknown;
}

export type RouteReason =
  | 'verification'
  | 'missing_event_type'
  | 'not_ideas_db'
  | 'not_page_update'
  | 'missing_assistant';

export interface RouteResult {
  routed: boolean;
  reason?: RouteReason;
  conversationId?: string;
  message?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asAny = (v: unknown): any => v as any;

function extractEventType(body: unknown): string | undefined {
  const b = asAny(body);
  const t =
    (typeof b?.type === 'string' && b.type) ||
    (typeof b?.event_type === 'string' && b.event_type) ||
    (typeof b?.event?.type === 'string' && b.event.type);
  return typeof t === 'string' ? t : undefined;
}

function extractData(body: unknown): unknown {
  const b = asAny(body);
  return b?.data ?? b?.payload ?? body;
}

function extractDatabaseId(data: unknown): string | undefined {
  const d = asAny(data);
  const candidate =
    (typeof d?.database_id === 'string' && d.database_id) ||
    (typeof d?.databaseId === 'string' && d.databaseId) ||
    (typeof d?.parent?.database_id === 'string' && d.parent.database_id) ||
    (typeof d?.parent?.databaseId === 'string' && d.parent.databaseId) ||
    (typeof d?.parent?.id === 'string' && d.parent.id);
  return typeof candidate === 'string' ? candidate : undefined;
}

function extractPageId(data: unknown): string | undefined {
  const d = asAny(data);
  const candidate =
    (typeof d?.page_id === 'string' && d.page_id) ||
    (typeof d?.pageId === 'string' && d.pageId) ||
    (typeof d?.id === 'string' && d.id) ||
    (typeof d?.page?.id === 'string' && d.page.id);
  return typeof candidate === 'string' ? candidate : undefined;
}

function extractTitle(data: unknown): string | undefined {
  const d = asAny(data);
  const direct =
    (typeof d?.title === 'string' && d.title) ||
    (typeof d?.name === 'string' && d.name);
  if (direct) return direct;

  // Best-effort Notion-ish shape: properties.Name.title[0].plain_text
  const maybe =
    d?.properties?.Name?.title?.[0]?.plain_text ??
    d?.properties?.name?.title?.[0]?.plain_text ??
    d?.properties?.Title?.title?.[0]?.plain_text;
  return typeof maybe === 'string' ? maybe : undefined;
}

function extractUrl(data: unknown): string | undefined {
  const d = asAny(data);
  const u =
    (typeof d?.url === 'string' && d.url) ||
    (typeof d?.page?.url === 'string' && d.page.url);
  return typeof u === 'string' ? u : undefined;
}

function isPageUpdateEvent(eventType: string): boolean {
  const t = eventType.toLowerCase();
  return t.includes('page') && (t.includes('update') || t.includes('updated'));
}

/**
 * Route a Notion webhook payload into the LangGraph chat.
 *
 * Current behavior (minimal, testable):
 * - ignores verification payloads (they are handled elsewhere)
 * - only routes page-update events
 * - if `ideasDatabaseId` is provided, only routes events for that DB
 *
 * The routed message is a concise "Notion update" summary that becomes
 * a user message into the LangGraph chat flow.
 */
export async function routeNotionWebhookToLangGraph(
  body: unknown,
  deps: {
    assistant: LangGraphChatLike;
    ideasDatabaseId?: string;
  }
): Promise<RouteResult> {
  if (!deps?.assistant) return { routed: false, reason: 'missing_assistant' };

  const b = asAny(body);
  if (typeof b?.verification_token === 'string' && b.verification_token.length > 0) {
    return { routed: false, reason: 'verification' };
  }

  const eventType = extractEventType(body);
  if (!eventType) return { routed: false, reason: 'missing_event_type' };
  if (!isPageUpdateEvent(eventType)) return { routed: false, reason: 'not_page_update' };

  const data = extractData(body);
  const databaseId = extractDatabaseId(data);
  if (deps.ideasDatabaseId && databaseId && databaseId !== deps.ideasDatabaseId) {
    return { routed: false, reason: 'not_ideas_db' };
  }
  if (deps.ideasDatabaseId && !databaseId) {
    // If the caller required an Ideas DB but we can't determine DB, do not route.
    return { routed: false, reason: 'not_ideas_db' };
  }

  const pageId = extractPageId(data) || 'unknown-page';
  const title = extractTitle(data) || 'Untitled idea';
  const url = extractUrl(data);

  const conversationId = `notion:${pageId}`;
  const message = [
    `Notion page updated (Ideas DB): ${title}`,
    `pageId: ${pageId}`,
    url ? `url: ${url}` : undefined,
    `eventType: ${eventType}`,
  ]
    .filter(Boolean)
    .join('\n');

  await deps.assistant.handleUserMessage('notion', message, conversationId);
  return { routed: true, conversationId, message };
}
