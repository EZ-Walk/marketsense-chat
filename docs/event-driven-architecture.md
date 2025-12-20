# Event-Driven Chat Architecture

This document preserves the architectural patterns developed during the initial sandbox phase.

## Core Concepts

### 1. Unified Event Stream
Every interaction is an event. This allows the chat to act as a "command center" or "activity feed" for multiple systems.
- **User Actions**: Messages, file uploads.
- **System Actions**: Agent responses, automated replies.
- **External Webhooks**: Email, SMS, Notion updates, etc.

### 2. Event Schema
Events follow a standard envelope:
- `id`: Unique UUID.
- `type`: Category (e.g., `chat.user`, `webhook.email`).
- `actor`: Who triggered it (User name, Agent ID, Phone number).
- `source`: Where it came from (UI, specific webhook integration).
- `payload`: Type-specific data.
- `createdAt`: Unix timestamp.

### 3. API Key Authentication
Simple, stateless authentication using an `x-api-key` header or query parameter. 
- Allows easy testing via `curl` or Postman.
- Persisted in local storage for development.

## Event Types

| Type | Source | Description |
| :--- | :--- | :--- |
| `chat.user` | Chat UI | Standard text message from the user. |
| `chat.agent` | Agent System | Response from an AI or bot. |
| `webhook.email` | Email Provider | Incoming email processed as a chat event. |
| `webhook.notion` | Notion Webhook | Notification of a page added or updated. |
| `webhook.sms` | SMS Provider | Incoming text message. |
| `file.uploaded` | Chat UI | File attachment event with metadata. |

## Subscription Pattern
The system uses **Server-Sent Events (SSE)** to stream the event bus to the frontend in real-time, ensuring the chat interface stays in sync with all external systems.

