# MarketSense Chat (Graphite + LangGraph)

A production-ready workshop environment for an event-driven chat interface, built on the **Graphite Agentic Framework** and powered by **LangGraph**.

## Architecture: The Graphite Pattern

This project implements the [Graphite Agentic Framework](https://github.com/binome-dev/graphite) architecture in TypeScript. It uses a modular, node-based approach to build AI agents that are:

- **Observable**: Real-time event streaming of the agent's internal state.
- **Auditability**: A unified event store capturing every state change and LLM call.
- **Composable**: Nodes and Tools are discrete components orchestrated via a central graph.

### Core Components

- **Assistants**: High-level orchestrators (`ChatAssistant`) managing the request lifecycle.
- **Nodes**: Discrete logic units (`LLMNode`, `RouterNode`, `ToolNode`) built as LangGraph nodes.
- **Tools**: Atomic functions for external integrations (e.g., search, data retrieval).
- **Workflow**: A LangGraph-powered state machine coordinating node transitions.

## Tech Stack

- **Engine**: [LangGraph.js](https://github.com/langchain-ai/langgraphjs) for stateful orchestration.
- **LLM**: Claude Haiku 4.5 (Anthropic SDK).
- **Frontend**: Vite + React + Tailwind CSS.
- **Backend**: Node.js + Express with Server-Sent Events (SSE) for real-time streaming.

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create a `.env` file in the root:
   ```bash
   ANTHROPIC_API_KEY=your_key_here
   PORT=3006
   API_KEY=dev-api-key
   ```

3. **Start the environment**:
   ```bash
   npm run dev
   ```

4. **Open the interface**:
   Go to [http://localhost:5173](http://localhost:5173)

## Usage

- **Everything is an Event**: Every chat message, tool call, and system log is a discrete Graphite event.
- **Lane Graph**: The system automatically routes messages between "Chat" and "Tool" lanes based on intent.
- **Sidebar**: Use the sidebar to monitor the event stream and trigger simulated webhooks.

## Documentation

- [Event-Driven Architecture](docs/event-driven-architecture.md): Detailed Graphite schema and patterns.
- [Research & Analysis](docs/research-analysis.md): Technical decisions and industry comparisons.
