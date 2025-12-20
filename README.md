# MarketSense Chat

A workshop environment for an event-driven chat interface.

## Core Concepts

- **Everything is an Event**: Chat messages, file uploads, and external webhooks (Email, SMS, Notion) are all unified into a single event stream.
- **Event-Driven UI**: The chat thread renders different event types (user/agent messages, system notifications) based on a consistent event schema.
- **Real-time Ingestion**: External systems can push data via webhooks which appear instantly in the chat.

## Tech Stack

- **Frontend**: Vite + React + Tailwind CSS
- **Backend**: Node.js + Express (API Key Auth + Event Store)
- **Streaming**: Server-Sent Events (SSE)

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the environment**:
   ```bash
   API_KEY=dev-api-key npm run dev
   ```

3. **Open the interface**:
   Go to [http://localhost:5173](http://localhost:5173) (or the port Vite provides)

## Usage

- **Chat**: Type in the input field to send `chat.user` events.
- **Simulation**: Use the sidebar to trigger mock webhooks and agent responses.
- **Authentication**: Enter the `API_KEY` in the sidebar to authorize the event stream.

## Architecture

See [docs/event-driven-architecture.md](docs/event-driven-architecture.md) for a detailed breakdown of the event patterns and schema.
