// Reusable base for every domain event across every bounded context.
// Establishes a consistent event shape (a name and an occurrence timestamp).
export abstract class DomainEvent {
  public readonly occurredAt: Date;

  protected constructor() {
    this.occurredAt = new Date();
  }

  abstract readonly eventName: string;
}
