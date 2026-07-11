// Reusable base for every domain event across every future bounded context —
// not Identity-specific. Establishes a consistent event shape (a name and an
// occurrence timestamp) before any publishing/subscription infrastructure
// exists; wiring an actual event bus is future work.
export abstract class DomainEvent {
  public readonly occurredAt: Date;

  protected constructor() {
    this.occurredAt = new Date();
  }

  abstract readonly eventName: string;
}
