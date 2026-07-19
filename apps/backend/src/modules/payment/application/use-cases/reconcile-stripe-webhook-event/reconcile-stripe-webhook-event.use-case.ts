import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { PaymentStatus } from '../../../domain/enums/payment-status.enum.js';
import type { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';

import type { ReconcileStripeWebhookEventCommand } from './reconcile-stripe-webhook-event.command.js';

// Reconciles an inbound Stripe event against the transaction it
// references. Deliberately idempotent and silent on an unknown reference
// or an already-consistent state -- a webhook receiver must never throw on
// a redundant or out-of-order delivery (Stripe retries on any non-2xx
// response, which would otherwise loop forever on a legitimately-already-
// applied event).
export class ReconcileStripeWebhookEventUseCase {
  constructor(
    private readonly paymentTransactionRepository: PaymentTransactionRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: ReconcileStripeWebhookEventCommand): Promise<void> {
    const transaction = await this.paymentTransactionRepository.findByExternalReference(command.externalReference);
    if (!transaction) {
      return;
    }

    if (command.outcome === 'succeeded' && transaction.getStatus() === PaymentStatus.Initiated) {
      transaction.markSucceeded();
    } else if (command.outcome === 'failed' && transaction.getStatus() === PaymentStatus.Initiated) {
      transaction.markFailed();
    } else {
      // Already in a terminal state consistent with this event (the
      // synchronous authorize() flow's common case), or a refund
      // confirmation for a refund this system already initiated -- either
      // way, nothing new to persist.
      return;
    }

    await this.paymentTransactionRepository.save(transaction);
    await this.eventDispatcher.dispatch(transaction.releaseDomainEvents());
  }
}
