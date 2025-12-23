import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { BaseMessage, AIMessage, HumanMessage } from "@langchain/core/messages";
import { ChatAnthropic } from "@langchain/anthropic";
import { v4 as uuid } from 'uuid';
import { globalWorkflow } from './workflow';
import { EventEnvelope, AnyEvent, createInvokeContext } from './types';

// Define the State
export const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  userId: Annotation<string>,
  conversationId: Annotation<string>,
  anthropicKey: Annotation<string | undefined>,
});

/**
 * Helper to emit events to the legacy workflow for UI observability
 */
function emitToLegacyWorkflow(event: AnyEvent, topic: string) {
  globalWorkflow.getTopic(topic).publish(event);
}

/**
 * Router Node - The "Lane Graph" implementation in LangGraph
 */
const routerNode = async (state: typeof GraphState.State) => {
  const lastMessage = state.messages[state.messages.length - 1];
  const text = lastMessage.content.toString().toLowerCase();

  const logEvent: AnyEvent = {
    id: uuid(),
    type: 'node.input',
    createdAt: Date.now(),
    actor: 'RouterNode',
    source: 'langgraph',
    context: createInvokeContext(state.userId, state.conversationId),
    payload: { message: `Router analyzing input: "${text}"` }
  };
  emitToLegacyWorkflow(logEvent, 'node_logs');

  if (text.includes('search')) {
    return "tools";
  } else {
    return "llm";
  }
};

/**
 * LLM Node - Processes text using ChatAnthropic
 */
const llmNode = async (state: typeof GraphState.State) => {
  const key = state.anthropicKey || process.env.ANTHROPIC_API_KEY;
  const context = createInvokeContext(state.userId, state.conversationId);
  
  if (!key) {
    const errorEvent: AnyEvent = {
      id: uuid(),
      type: 'chat.agent',
      createdAt: Date.now(),
      actor: 'system',
      source: 'error-handler',
      context,
      payload: { text: "Anthropic API Key missing. Set it in the sidebar.", agentId: 'system' },
    };
    emitToLegacyWorkflow(errorEvent, 'assistant_output');
    return { messages: [new AIMessage("Error: API Key missing")] };
  }

  const llm = new ChatAnthropic({
    apiKey: key,
    modelName: "claude-haiku-4-5",
    maxTokens: 1024,
  });

  const response = await llm.invoke(state.messages);

  const outputEvent: EventEnvelope<'chat.agent'> = {
    id: uuid(),
    type: 'chat.agent',
    createdAt: Date.now(),
    actor: 'claude-haiku-4.5',
    source: 'anthropic-api',
    context,
    payload: { text: response.content.toString(), agentId: 'graphite-claude' },
  };
  emitToLegacyWorkflow(outputEvent, 'assistant_output');

  return { messages: [response] };
};

/**
 * Tool Node - Mocking external search tool
 */
const toolNode = async (state: typeof GraphState.State) => {
  const lastMessage = state.messages[state.messages.length - 1];
  const text = lastMessage.content.toString();
  const context = createInvokeContext(state.userId, state.conversationId);

  const logEvent: AnyEvent = {
    id: uuid(),
    type: 'node.input',
    createdAt: Date.now(),
    actor: 'ToolNode',
    source: 'langgraph',
    context,
    payload: { message: "ToolNode: Mocking external search tool..." }
  };
  emitToLegacyWorkflow(logEvent, 'node_logs');

  await new Promise(r => setTimeout(r, 1500)); // Simulate work

  const mockSearchResult = `Found 3 results for "${text}" in the MarketSense database. The most relevant result is a recent analysis on Graphite architecture.`;

  const outputEvent: EventEnvelope<'chat.agent'> = {
    id: uuid(),
    type: 'chat.agent',
    createdAt: Date.now(),
    actor: 'search-tool',
    source: 'internal-db',
    context,
    payload: { text: mockSearchResult, agentId: 'tool-executor' },
  };
  emitToLegacyWorkflow(outputEvent, 'assistant_output');

  return { messages: [new AIMessage(mockSearchResult)] };
};

// Build the Graph
const workflow = new StateGraph(GraphState)
  .addNode("llm", llmNode)
  .addNode("tools", toolNode)
  .addConditionalEdges(START, routerNode, {
    llm: "llm",
    tools: "tools",
  })
  .addEdge("llm", END)
  .addEdge("tools", END);

export const graph = workflow.compile();

/**
 * ChatAssistant handles high-level orchestration (Compatibility Wrapper)
 */
export class ChatAssistant {
  async handleUserMessage(userId: string, text: string, conversationId?: string, anthropicKey?: string) {
    const context = createInvokeContext(userId, conversationId);
    
    // 1. Emit the user message event for UI observability
    const userEvent: EventEnvelope<'chat.user'> = {
      id: uuid(),
      type: 'chat.user',
      createdAt: Date.now(),
      actor: userId,
      source: 'chat-ui',
      context,
      payload: { text },
    };
    globalWorkflow.getTopic('user_input').publish(userEvent);

    // 2. Invoke the LangGraph
    await graph.invoke({
      messages: [new HumanMessage(text)],
      userId,
      conversationId: context.conversationId,
      anthropicKey,
    });

    return userEvent;
  }
}

export const assistant = new ChatAssistant();
