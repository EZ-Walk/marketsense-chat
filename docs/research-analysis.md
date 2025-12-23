# Chat Module Research & Analysis

## Executive Summary

The MarketSense chat module is built as an event-driven agentic system. While initial research considered various frameworks like Vercel AI SDK, the final architecture leverages the **Graphite Agentic Framework** (for architectural patterns) and **LangGraph.js** (for orchestration). This combination provides superior observability, auditability, and control over complex multi-step workflows compared to standard chat libraries.

## Chosen Technology Stack

### 🚀 Orchestration: LangGraph.js + Graphite Framework
**Why:** Graphite provides a clear separation between Assistants, Nodes, and Tools, while LangGraph offers a robust state machine for managing node transitions.

- **LangGraph**: [github.com/langchain-ai/langgraphjs](https://github.com/langchain-ai/langgraphjs)
- **Graphite (Design Pattern)**: [github.com/binome-dev/graphite](https://github.com/binome-dev/graphite)
- **Key Features**: 
  - **Unified Event Stream**: Every internal decision is an observable event.
  - **Stateful Persistence**: Durable execution of long-running workflows.
  - **Lane Graph Architecture**: Dynamic routing between conversational and tool-based lanes.

### 🧠 Model: Claude Haiku 4.5
**Why:** Optimized for speed and cost-effectiveness in high-frequency conversational workflows, while maintaining high reasoning capabilities for tool selection.

### 🎨 UI Components: Custom Event-Driven React
**Why:** Since "Everything is an Event," the UI must be able to render a wide variety of event types (User messages, Agent thoughts, Tool results, System notifications) from a single stream.

## Architecture Patterns

### Graphite Event Envelope
Every interaction is wrapped in a standard envelope to ensure full auditability:

```typescript
export interface EventEnvelope<T extends EventType, P = any> {
  id: string;
  type: T;
  createdAt: number;
  actor: string;
  source: string;
  context: {
    conversationId: string;
    assistantRequestId: string;
    invokeId: string;
    userId: string;
  };
  payload: P;
}
```

### Lane Graph Pattern
The system implements a "Lane Graph" where the `RouterNode` analyzes user intent to branch the workflow:
- **Chat Lane**: Direct conversational responses via LLM.
- **Tool Lane**: Execution of specialized tasks (e.g., search, data extraction).

## Implementation Progress

### Phase 1: Core Orchestration (Completed)
- [x] Integrate LangGraph.js with Graphite architectural layers.
- [x] Implement `RouterNode`, `LLMNode`, and `ToolNode`.
- [x] Configure Anthropic Claude Haiku 4.5.
- [x] Unified event emission for all node transitions.

### Phase 2: Production Readiness (In Progress)
- [ ] Implement durable state persistence using LangGraph Checkpointers.
- [ ] Add human-in-the-loop (HITL) nodes for sensitive tool actions.
- [ ] Expand tool suite for deeper MarketSense data integration.

## Key Dependencies

```json
{
  "dependencies": {
    "@langchain/langgraph": "^latest",
    "@langchain/anthropic": "^latest",
    "@langchain/core": "^latest",
    "express": "^4.19.2",
    "uuid": "^9.0.1"
  }
}
```

## Resources & References

- [Graphite Agentic Framework GitHub](https://github.com/binome-dev/graphite)
- [LangGraph.js Documentation](https://langchain-ai.github.io/langgraphjs/)
- [Anthropic API Reference](https://docs.anthropic.com/claude/reference/)
