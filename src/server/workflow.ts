import { EventEmitter } from 'events';
import { AnyEvent, Topic } from './types';

/**
 * Graphite-inspired Workflow Orchestrator
 * Uses a Pub/Sub pattern with in-memory message queuing
 */
export class Workflow {
  private emitter = new EventEmitter();
  private topics: Map<string, Topic<any>> = new Map();

  getTopic<T = AnyEvent>(name: string): Topic<T> {
    if (this.topics.has(name)) {
      return this.topics.get(name)!;
    }

    const topic: Topic<T> = {
      name,
      publish: (event: T) => {
        this.emitter.emit(`topic:${name}`, event);
        // Also emit to a global 'all' topic for observability/storage
        this.emitter.emit('all', { topic: name, event });
      },
      subscribe: (handler: (event: T) => void) => {
        this.emitter.on(`topic:${name}`, handler);
        return () => this.emitter.off(`topic:${name}`, handler);
      },
    };

    this.topics.set(name, topic);
    return topic;
  }

  // Global subscription for the Event Store / SSE Stream
  subscribeToAll(handler: (data: { topic: string; event: AnyEvent }) => void) {
    this.emitter.on('all', handler);
    return () => this.emitter.off('all', handler);
  }
}

/**
 * Base Node class following Graphite's Node layer
 */
export abstract class GraphiteNode {
  constructor(
    protected workflow: Workflow,
    public name: string
  ) {}

  abstract setup(): void;
}

export const globalWorkflow = new Workflow();

