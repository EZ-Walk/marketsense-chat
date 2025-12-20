import { globalWorkflow, GraphiteNode } from './workflow';
import { AnyEvent, EventEnvelope, createInvokeContext } from './types';
import { v4 as uuid } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';

/**
 * ChatAssistant handles high-level orchestration
 */
export class ChatAssistant extends GraphiteNode {
  setup() {}

  async handleUserMessage(userId: string, text: string, conversationId?: string, anthropicKey?: string) {
    const context = createInvokeContext(userId, conversationId);
    const event: EventEnvelope<'chat.user'> = {
      id: uuid(),
      type: 'chat.user',
      createdAt: Date.now(),
      actor: userId,
      source: 'chat-ui',
      context,
      payload: { text },
    };

    // Store the key in the context for this invoke if provided
    (event as any).anthropicKey = anthropicKey;

    this.workflow.getTopic('user_input').publish(event);
    return event;
  }
}

/**
 * RouterNode - The "Lane Graph" implementation.
 */
export class RouterNode extends GraphiteNode {
  setup() {
    this.workflow.getTopic<EventEnvelope<'chat.user'>>('user_input').subscribe(async (event) => {
      this.log(event, `Router analyzing input: "${event.payload.text}"`);

      if (event.payload.text.toLowerCase().includes('search')) {
        this.log(event, "Routing to: TOOL LANE");
        this.workflow.getTopic('tool_input').publish(event);
      } else {
        this.log(event, "Routing to: CHAT LANE");
        this.workflow.getTopic('chat_lane').publish(event);
      }
    });
  }

  private log(event: AnyEvent, message: string) {
    this.workflow.getTopic('node_logs').publish({
      ...event,
      id: uuid(),
      type: 'node.input',
      payload: { message }
    });
  }
}

/**
 * LLMNode processes text using real Anthropic API
 */
export class LLMNode extends GraphiteNode {
  setup() {
    this.workflow.getTopic<EventEnvelope<'chat.user'>>('chat_lane').subscribe(async (event) => {
      this.log(event, "LLMNode: Generating response via Anthropic...");

      try {
        const key = (event as any).anthropicKey || process.env.ANTHROPIC_API_KEY;
        if (!key) {
          throw new Error("Anthropic API Key missing. Set it in the sidebar.");
        }

        const anthropic = new Anthropic({ apiKey: key });

        const msg = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20240620",
          max_tokens: 1024,
          messages: [{ role: "user", content: event.payload.text }],
        });

        const responseText = msg.content[0].type === 'text' ? msg.content[0].text : "Received non-text response";

        const outputEvent: EventEnvelope<'chat.agent'> = {
          id: uuid(),
          type: 'chat.agent',
          createdAt: Date.now(),
          actor: 'claude-3.5',
          source: 'anthropic-api',
          context: event.context,
          payload: { text: responseText, agentId: 'graphite-claude' },
        };

        this.workflow.getTopic('assistant_output').publish(outputEvent);
      } catch (err: any) {
        this.log(event, `Error: ${err.message}`);
        this.workflow.getTopic('assistant_output').publish({
          id: uuid(),
          type: 'chat.agent',
          createdAt: Date.now(),
          actor: 'system',
          source: 'error-handler',
          context: event.context,
          payload: { text: `Error: ${err.message}`, agentId: 'system' },
        });
      }
    });
  }

  private log(event: AnyEvent, message: string) {
    this.workflow.getTopic('node_logs').publish({
      ...event,
      id: uuid(),
      type: 'node.input',
      payload: { message }
    });
  }
}

/**
 * ToolNode - Handles external function calls
 */
export class ToolNode extends GraphiteNode {
  setup() {
    this.workflow.getTopic<EventEnvelope<'chat.user'>>('tool_input').subscribe(async (event) => {
      this.log(event, "ToolNode: Mocking external search tool...");
      
      await new Promise(r => setTimeout(r, 1500)); // Simulate work

      const mockSearchResult = `Found 3 results for "${event.payload.text}" in the MarketSense database. The most relevant result is a recent analysis on Graphite architecture.`;

      const outputEvent: EventEnvelope<'chat.agent'> = {
        id: uuid(),
        type: 'chat.agent',
        createdAt: Date.now(),
        actor: 'search-tool',
        source: 'internal-db',
        context: event.context,
        payload: { text: mockSearchResult, agentId: 'tool-executor' },
      };

      this.workflow.getTopic('assistant_output').publish(outputEvent);
    });
  }

  private log(event: AnyEvent, message: string) {
    this.workflow.getTopic('node_logs').publish({
      ...event,
      id: uuid(),
      type: 'node.input',
      payload: { message }
    });
  }
}

// Initialize the system
export const assistant = new ChatAssistant(globalWorkflow, 'MainAssistant');
export const routerNode = new RouterNode(globalWorkflow, 'RouterNode');
export const llmNode = new LLMNode(globalWorkflow, 'LLMNode');
export const toolNode = new ToolNode(globalWorkflow, 'ToolNode');

assistant.setup();
routerNode.setup();
llmNode.setup();
toolNode.setup();
