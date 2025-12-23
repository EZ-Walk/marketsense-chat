# Event-Driven Chat Architecture (Graphite + LangGraph)

This document outlines the architectural patterns for the MarketSense chat module, which follows the **Graphite Agentic Framework** architecture powered by the **LangGraph** orchestration engine.

## Core Principles (Graphite)

Our implementation adheres to the four pillars of Graphite:

1. **Observability**: Every node transition and LLM call is captured as a discrete event, allowing real-time monitoring of the agent's thought process.
2. **Idempotency**: Workflows are designed to be retriable. The state is managed within the LangGraph state container, ensuring consistency across retries.
3. **Auditability**: All state changes and decision paths are logged to a unified event store, serving as the single source of truth for compliance and debugging.
4. **Restorability**: Using LangGraph's checkpointer mechanism (planned), long-running tasks can be resumed from the exact point of failure.

## Graphite Layers

The system is organized into the conceptual layers defined by Graphite:

- **Assistants**: High-level orchestrators (`ChatAssistant`) that manage the complete lifecycle of a user request.
- **Nodes**: Discrete processing units in the graph (e.g., `RouterNode`, `LLMNode`, `ToolNode`) that operate on a shared state.
- **Tools**: Atomic functions (e.g., search tools, database lookups) invoked by nodes to perform specific tasks.
- **Workflow**: The orchestration mechanism (implemented via LangGraph) that coordinates interaction between nodes using a directed acyclic graph (DAG) pattern.

## Event Schema

Events follow the Graphite standard envelope to ensure cross-system compatibility:

- `id`: Unique UUID.
- `type`: Category (e.g., `chat.user`, `chat.agent`, `node.input`).
- `actor`: The entity that triggered the event (User ID, Agent ID, or System).
- `source`: The origin of the event (e.g., `chat-ui`, `anthropic-api`, `internal-db`).
- `createdAt`: Unix timestamp.
- `context`: The **Invoke Context** managing identifiers across the lifecycle:
    - `conversationId`: Groups multiple invokes into a single conversation.
    - `assistantRequestId`: Tracks a specific request through the assistant's workflow.
    - `invokeId`: Identifies the individual user request.
    - `userId`: Identifies the specific user.
- `payload`: Type-specific data (e.g., message text, tool results).

## Lane Graph Pattern

We implement a "Lane Graph" approach where the `RouterNode` acts as a traffic controller, dynamically branching the workflow based on user intent:

1. **User Lane**: Standard conversational flow via `LLMNode`.
2. **Tool Lane**: Automated task execution via `ToolNode` (e.g., searching the MarketSense database).

## Real-time Streaming

The system uses **Server-Sent Events (SSE)** to stream the internal Graphite event bus to the frontend. This ensures that the UI can render intermediate "thoughts" (node inputs) and system notifications in addition to final chat responses.


