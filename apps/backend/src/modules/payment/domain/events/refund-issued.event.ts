import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/05-information-architecture.md's Payments Domain entry:
// "Produces PaymentCompleted, RefundIssued."
export class RefundIssuedEvent extends DomainEvent {
  readonly eventName = 'payment.transaction.refund-issued';

  constructor(public readonly paymentTransactionId: string) {
    super();
  }
}
