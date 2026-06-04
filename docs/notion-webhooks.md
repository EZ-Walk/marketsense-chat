## Notion webhook listener (local) + tunnel

This repo already exposes a webhook endpoint at:

- `POST /api/webhooks/notion`

It will:

- Emit `webhook.notion.verification` when Notion sends the initial `verification_token` payload (and logs the token).
- Emit `webhook.notion` for all subsequent events.
- Optionally verify signatures when `NOTION_WEBHOOK_VERIFICATION_TOKEN` is set.

### 1) Start the server

From `marketsense-chat/`:

```bash
npm run dev:server
```

Defaults to `http://localhost:3006`.

### 2) Start a tunnel (ngrok)

If you have `ngrok` installed:

```bash
ngrok http 3006
```

Copy the **Forwarding** HTTPS URL (example: `https://abcd-1234.ngrok-free.app`).

Your Notion webhook URL becomes:

- `https://abcd-1234.ngrok-free.app/api/webhooks/notion`

### 3) Complete Notion verification handshake

When Notion first pings the webhook URL, this server logs:

- `received verification_token (store as NOTION_WEBHOOK_VERIFICATION_TOKEN): ...`

Take that token and set it as an environment variable, then restart the server:

```bash
export NOTION_WEBHOOK_VERIFICATION_TOKEN="paste_token_here"
npm run dev:server
```

Once set, the server will **reject** webhook requests with missing/invalid `X-Notion-Signature`.

### 4) Observe events streaming through the app

You can watch events via the existing SSE stream:

- `GET /api/stream` (requires `x-api-key` matching `API_KEY`)

Or fetch recent events:

- `GET /api/events` (requires `x-api-key`)

### Environment variables

- `API_KEY`: API key required by `/api/stream` and other protected routes (default: `dev-api-key`)
- `NOTION_WEBHOOK_VERIFICATION_TOKEN`: webhook signing secret (captured from verification payload)
- `NOTION_INTEGRATION_TOKEN`: Notion internal integration token (not used by the webhook listener yet; will be used when we add Notion API calls)

