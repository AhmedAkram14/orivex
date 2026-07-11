import { EventEmitter } from 'node:events';

import { Injectable } from '@nestjs/common';

import type { DomainEventDispatcher } from '../../application/ports/domain-event-dispatcher.port.js';
import type { DomainEvent } from '../../domain/events/domain-event.js';

// Simple in-process implementation: emits each event on a local
// EventEmitter so future subscribers can `.on(eventName, handler)`. No
// logging, no external broker — purely infrastructure plumbing. Upgrading to
// a real message broker later is a drop-in replacement behind the same
// DomainEventDispatcher port (docs/10-backend-architecture.md Section 14's
// evolution path).
@Injectable()
export class InProcessDomainEventDispatcher implements DomainEventDispatcher {
  private readonly emitter = new EventEmitter();

  async dispatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      this.emitter.emit(event.eventName, event);
    }
  }

  on(eventName: string, handler: (event: DomainEvent) => void): void {
    this.emitter.on(eventName, handler);
  }
}
