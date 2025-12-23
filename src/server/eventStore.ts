import { EventEmitter } from 'events';
import { AnyEvent } from './types';

const MAX_EVENTS = 1000;

export class EventStore {
  private events: AnyEvent[] = [];
  private emitter = new EventEmitter();

  append(event: AnyEvent) {
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) {
      this.events.shift();
    }
    this.emitter.emit('event', event);
  }

  list(limit = 100): AnyEvent[] {
    return this.events.slice(-limit);
  }

  subscribe(handler: (event: AnyEvent) => void) {
    this.emitter.on('event', handler);
    return () => this.emitter.off('event', handler);
  }
}

export const globalEventStore = new EventStore();


