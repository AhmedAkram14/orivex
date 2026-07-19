import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity.js';
import type { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';
import type { PaymentGatewayPort } from '../../ports/payment-gateway.port.js';

import type { RefundPaymentCommand } from './refund-payment.command.js';

// Orchestrates: load the transaction -> PaymentTransaction.refund() (the
// domain invariant: only Succeeded/Settled, only with a gateway reference
// attached) -> PaymentGatewayPort.refund() (the actual money movement) ->
// persist -> dispatch RefundIssuedEvent. If the gateway call fails after
// the domain transition, the transaction is NOT persisted as Refunded --
// callers see the thrown error and the transaction stays in its prior
// status, safe to retry.
export class RefundPaymentUseCase {
  constructor(
    private readonly paymentTransactionRepository: PaymentTransactionRepository,
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: RefundPaymentCommand): Promise<PaymentTransaction> {
    const transaction = await this.paymentTransactionRepository.findById(command.paymentTransactionId);
    if (!transaction) {
      throw new NotFoundError(`PaymentTransaction "${command.paymentTransactionId}" not found.`);
    }

    transaction.refund();

    // refund() above already validated a gateway reference is attached
    // (throws PaymentDomainError otherwise) -- guaranteed defined here.
    const externalReference = transaction.getExternalReference();
    if (!externalReference) {
      throw new NotFoundError(`PaymentTransaction "${command.paymentTransactionId}" has no gateway reference.`);
    }
    await this.paymentGateway.refund({ externalReference });

    await this.paymentTransactionRepository.save(transaction);
    await this.eventDispatcher.dispatch(transaction.releaseDomainEvents());

    return transaction;
  }
}
