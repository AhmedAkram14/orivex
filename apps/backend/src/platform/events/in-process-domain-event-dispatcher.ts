import { Injectable } from '@nestjs/common';

import type { DomainEvent } from '../../shared/domain/domain-event.js';
import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';

type EventHandler = (event: DomainEvent) => void | Promise<void>;

// Simple in-process implementation: a plain eventName -> handlers registry,
// with dispatch() awaiting every matching handler before resolving. This
// does NOT use node:events' EventEmitter -- EventEmitter.emit() is
// fire-and-forget for async listeners (it never awaits a returned Promise),
// which previously let dispatch() resolve before an async subscriber (e.g.
// ClinicalModule's PendingAISuggestionAcknowledgmentHandler) had finished
// its write, letting a request race past a safety gate that depends on
// that write already being visible. Awaiting handlers here closes that gap.
// Upgrading to a real message broker later is a drop-in replacement behind
// the same DomainEventDispatcher port (docs/10-backend-architecture.md
// Section 14's evolution path). One singleton instance app-wide
// (platform/events/events.module.ts).
@Injectable()
export class InProcessDomainEventDispatcher implements DomainEventDispatcher {
  private readonly handlers = new Map<string, EventHandler[]>();

  async dispatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = this.handlers.get(event.eventName) ?? [];
      for (const handler of handlers) {
        await handler(event);
      }
    }
  }

  subscribe(eventName: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventName);
    if (handlers) {
      handlers.push(handler);
    } else {
      this.handlers.set(eventName, [handler]);
    }
  }
}
