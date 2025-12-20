import { v4 as uuid } from 'uuid';

/**
 * Graphite-inspired Invoke Context
 * Manages identifiers across message life cycles
 */
export interface InvokeContext {
  conversationId: string;
  assistantRequestId: string;
  invokeId: string;
  userId: string;
}

export type EventType =
  | 'chat.user'
  | 'chat.agent'
  | 'node.input'
  | 'node.output'
  | 'tool.call'
  | 'tool.result'
  | 'webhook.email'
  | 'webhook.notion'
  | 'webhook.sms'
  | 'file.uploaded'
  | 'error';

export interface EventEnvelope<T extends EventType, P = any> {
  id: string;
  type: T;
  createdAt: number;
  actor: string;
  source: string;
  context: InvokeContext;
  payload: P;
}

export type AnyEvent = EventEnvelope<EventType>;

export interface Topic<T = AnyEvent> {
  name: string;
  publish(event: T): void;
  subscribe(handler: (event: T) => void): () => void;
}

export function createInvokeContext(userId: string, conversationId?: string): InvokeContext {
  return {
    userId,
    conversationId: conversationId || uuid(),
    assistantRequestId: uuid(),
    invokeId: uuid(),
  };
}
