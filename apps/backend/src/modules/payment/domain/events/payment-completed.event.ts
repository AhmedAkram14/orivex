import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/05-information-architecture.md's Payments Domain entry:
// "Produces PaymentCompleted, RefundIssued."
export class PaymentCompletedEvent extends DomainEvent {
  readonly eventName = 'payment.transaction.completed';

  constructor(public readonly paymentTransactionId: string) {
    super();
  }
}
