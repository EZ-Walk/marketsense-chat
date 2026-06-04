# MarketSense Event-Driven Chat Integration

This document describes the event-reactive chat system that automatically initiates conversations based on MarketSense system events.

## Overview

The integration creates an **event-driven conversational interface** where MarketSense events automatically load into chat as contextual discussions. This transforms the chat from a standalone tool into a **reactive assistant** that proactively engages users about system events.

Key Components:
- **Event-Reactive UI**: Chat automatically responds to system events
- **Contextual AI Agent**: LangGraph agent with event-specific analysis tools  
- **Multi-Thread Management**: Separate conversations for different events
- **Auto-Initiation**: Conversations start automatically for significant events

## Architecture

```
┌─────────────────────┐    Event Flow    ┌─────────────────────┐    Event Stream    ┌─────────────────┐
│ Event-Driven Chat   │◀────────────────│ Event Gateway       │◀─────────────────│ MarketSense     │
│                     │                 │                     │                  │ System Events   │
│ - Event Feed        │                 │ - Contextual Agent  │                  │                 │
│ - Auto-Initiation   │                 │ - Event Analysis    │                  │ - Campaigns     │
│ - Multi-Threading   │                 │ - Action Tools      │                  │ - Content       │
│ - Context Cards     │                 │ - Context Passing   │                  │ - Webhooks      │
└─────────────────────┘                 └─────────────────────┘                  └─────────────────┘
```

### Event-to-Chat Flow

1. **Event Occurs**: MarketSense system generates event (e.g., `post.needs_revision`)
2. **Event Detection**: Chat interface receives event via SSE stream
3. **Context Creation**: Event automatically converted to conversational context
4. **Thread Initiation**: New chat thread created with event-specific context
5. **AI Analysis**: Agent analyzes event with specialized tools and provides insights
6. **User Interaction**: User can discuss, ask questions, or take actions based on event

## Key Components

### 1. EventDrivenChat (`src/client/components/EventDrivenChat.tsx`)

The main chat interface with event-reactive capabilities:

**Event Detection & Context Creation**:
```typescript
// Converts MarketSense events to chat contexts
const eventToContext = (event: MarketSenseEvent): ChatContext => {
  switch (event.event_type) {
    case 'post.needs_revision':
      return {
        eventType: event.event_type,
        summary: `Content needs revision: ${event.payload.feedback}`,
        suggestedActions: ['Review feedback', 'Revise strategy', 'Re-generate content']
      };
    // ... other event types
  }
};
```

**Auto-Initiation Logic**:
```typescript
// Automatically creates chat threads for significant events
const shouldInitiateChat = (event: MarketSenseEvent): boolean => {
  const triggerEvents = ['post.needs_revision', 'campaign.created', 'post.approved'];
  return autoInitiateChat && triggerEvents.includes(event.event_type);
};
```

### 2. Enhanced MarketSense Agent (`event-gateway/src/agent.py`)

AI agent with event-specific analysis tools:

**Event Analysis Tools**:
- `analyze_event_significance()` - Explains business impact of events
- `recommend_next_actions()` - Provides action recommendations
- `search_notion()` - Searches related Notion content

**Contextual System Prompt**:
```python
if event_context:
    system_prompt = f"""You are analyzing event: {event_type}
    Summary: {event_summary}
    Data: {event_data}
    
    Provide: analysis, recommendations, next steps, opportunities"""
```

### 3. Multi-Thread Management

Each significant event creates its own conversation thread:

```typescript
interface ConversationThread {
  id: string;
  context: ChatContext;      // Event context
  messages: ChatMessage[];   // Thread conversation
  isActive: boolean;         // Currently selected
  createdAt: string;
}
```

## Configuration

### Environment Setup

1. **Start MarketSense Event Gateway**:
   ```bash
   cd /path/to/MarketSense/event-gateway
   uvicorn src.main:app --reload --port 8000
   ```

2. **Start marketsense-chat**:
   ```bash
   cd /path/to/marketsense-chat
   npm run dev
   ```

### UI Configuration

In the chat interface sidebar, configure:

| Field | Description | Default |
|-------|-------------|---------|
| **MarketSense Gateway URL** | Event Gateway endpoint | `http://localhost:8000` |
| **Customer ID** | Your customer identifier | `dev` |
| **API Key** | Event Gateway API key | `dev-api-key` |
| **Anthropic API Key** | For AI responses | _(optional)_ |

### Connection Status

The interface shows real-time connection status:
- 🟢 **Connected**: Gateway and event stream active
- 🟡 **Connecting**: Attempting connection
- 🔴 **Error**: Connection failed

## Event Flow

### 1. Chat Messages

```
User Input → marketsense-chat → Event Gateway → LangGraph Agent → PostgreSQL Event Stream → Response via SSE
```

### 2. System Events

```
External Webhooks → Event Gateway → Event Stream → marketsense-chat (via SSE)
```

### 3. Webhook Simulation

The simulator buttons now trigger MarketSense webhooks:
- **Email**: Creates Notion page representing email
- **Notion**: Direct Notion webhook
- **SMS**: Creates Notion page representing SMS

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|---------|---------|
| `/health` | GET | Gateway health check |
| `/api/chat/messages` | POST | Send chat messages |
| `/api/events/stream` | GET | SSE event stream |
| `/api/chat/history` | GET | Chat history retrieval |
| `/webhooks/notion` | POST | Webhook simulation |

## Event Types

### Chat Events
- `chat.user` - User messages
- `chat.agent` - AI responses
- `system.error` - Error messages

### MarketSense Events
- `campaign.created` - New campaigns
- `post.written` - Content generated
- `webhook.received` - External webhooks

### System Events
- `node.*` - Processing status
- `system.message` - System notifications

## Development

### Local Testing

1. **Verify Event Gateway**: `curl http://localhost:8000/health`
2. **Open Chat Interface**: `http://localhost:5173`
3. **Send Test Message**: Use chat input
4. **Trigger Simulation**: Use sidebar buttons
5. **Monitor Events**: Watch real-time event stream

### Debugging

- **Browser Console**: Connection logs and errors
- **Event Gateway Logs**: Processing status
- **Network Tab**: API request/response inspection

## Benefits

### ✅ Unified Experience
- Single chat interface for MarketSense system
- Real-time event visualization
- Seamless agent communication

### ✅ Scalability
- PostgreSQL row-locking coordination
- Multi-service event routing
- Persistent event history

### ✅ Observability
- Complete event audit trail
- Real-time system monitoring
- Connection status tracking

### ✅ Flexibility
- Configurable gateway endpoints
- Multi-customer support
- Webhook simulation for testing

## Troubleshooting

### Connection Issues

1. **Gateway Not Responding**:
   - Check if Event Gateway is running on port 8000
   - Verify network connectivity
   - Check CORS configuration

2. **SSE Stream Fails**:
   - Verify customer ID format
   - Check authentication (if enabled)
   - Monitor browser console for errors

3. **Chat Not Working**:
   - Confirm Anthropic API key (if required)
   - Check Event Gateway chat API endpoint
   - Verify request/response formats

### Event Stream Issues

1. **Events Not Appearing**:
   - Check PostgreSQL database connection
   - Verify event stream initialization
   - Monitor Event Gateway logs

2. **Duplicate Events**:
   - Check event ID generation
   - Verify deduplication logic
   - Monitor event stream coordination

## Future Enhancements

### Planned Features
- [ ] Multi-agent chat support
- [ ] Campaign management UI
- [ ] Real-time graph topology visualization
- [ ] Advanced webhook routing
- [ ] Chat history persistence

### Potential Improvements
- [ ] Typed event schemas
- [ ] Event stream reconnection logic
- [ ] Enhanced error handling
- [ ] Performance monitoring
- [ ] Custom event filters

## Related Documentation

- [MarketSense CLAUDE.md](../CLAUDE.md) - Main project documentation
- [Event Stream Documentation](../EVENT_STREAM.md) - Event coordination details
- [Event Gateway README](../event-gateway/README.md) - API Gateway documentation
- [Graphite Framework](https://github.com/binome-dev/graphite) - Original chat framework