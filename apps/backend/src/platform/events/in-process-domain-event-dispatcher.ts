import { EventEmitter } from 'node:events';

import { Injectable } from '@nestjs/common';

import type { DomainEvent } from '../../shared/domain/domain-event.js';
import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';

// Simple in-process implementation: emits each event on a local
// EventEmitter so subscribers can register via `.subscribe(eventName,
// handler)`. No logging, no external broker — purely infrastructure
// plumbing. Upgrading to
// a real message broker later is a drop-in replacement behind the same
// DomainEventDispatcher port (docs/10-backend-architecture.md Section 14's
// evolution path). One singleton instance app-wide (platform/events/events.module.ts).
@Injectable()
export class InProcessDomainEventDispatcher implements DomainEventDispatcher {
  private readonly emitter = new EventEmitter();

  async dispatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      this.emitter.emit(event.eventName, event);
    }
  }

  subscribe(eventName: string, handler: (event: DomainEvent) => void | Promise<void>): void {
    this.emitter.on(eventName, handler);
  }
}
