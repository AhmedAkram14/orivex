import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEvent } from '../../../../../shared/domain/domain-event.js';
import { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import { PaymentStatus } from '../../../domain/enums/payment-status.enum.js';
import { PaymentDomainError } from '../../../domain/exceptions/payment-domain.error.js';
import { RefundIssuedEvent } from '../../../domain/events/refund-issued.event.js';
import type { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';
import { Money } from '../../../domain/value-objects/money.value-object.js';
import type {
  AuthorizePaymentRequest,
  AuthorizePaymentResult,
  PaymentGatewayPort,
  RefundPaymentRequest,
  RefundPaymentResult,
} from '../../ports/payment-gateway.port.js';

import { RefundPaymentCommand } from './refund-payment.command.js';
import { RefundPaymentUseCase } from './refund-payment.use-case.js';

class FakePaymentTransactionRepository implements PaymentTransactionRepository {
  public readonly saved: PaymentTransaction[] = [];
  constructor(private readonly transaction: PaymentTransaction | null) {}
  async findById(id: string): Promise<PaymentTransaction | null> {
    return this.transaction && this.transaction.getId() === id ? this.transaction : null;
  }
  async findByIdempotencyKey(): Promise<PaymentTransaction | null> {
    return null;
  }
  async findByExternalReference(): Promise<PaymentTransaction | null> {
    return null;
  }
  async findByConsultationSessionId(): Promise<PaymentTransaction | null> {
    return null;
  }
  async save(transaction: PaymentTransaction): Promise<void> {
    this.saved.push(transaction);
  }
}

class FakeGateway implements PaymentGatewayPort {
  public refundCallCount = 0;
  public lastRefundRequest: RefundPaymentRequest | undefined;
  constructor(private readonly refundResult: RefundPaymentResult | Error = { succeeded: true }) {}
  async authorize(_request: AuthorizePaymentRequest): Promise<AuthorizePaymentResult> {
    throw new Error('not used by RefundPaymentUseCase');
  }
  async refund(request: RefundPaymentRequest): Promise<RefundPaymentResult> {
    this.refundCallCount += 1;
    this.lastRefundRequest = request;
    if (this.refundResult instanceof Error) {
      throw this.refundResult;
    }
    return this.refundResult;
  }
}

class RecordingDispatcher {
  public readonly dispatched: DomainEvent[] = [];
  async dispatch(events: DomainEvent[]): Promise<void> {
    this.dispatched.push(...events);
  }
  subscribe(): void {}
}

function buildSucceededTransaction(externalReference = 'pi_test_123'): PaymentTransaction {
  const transaction = PaymentTransaction.initiate({
    idempotencyKey: 'idem-key-refund-1',
    consultationSessionId: '11111111-1111-4111-8111-111111111111',
    patientId: '22222222-2222-4222-8222-222222222222',
    doctorId: '33333333-3333-4333-8333-333333333333',
    amount: Money.create(500, 'EGP'),
    paymentMethod: PaymentMethod.Card,
  });
  transaction.attachExternalReference(externalReference);
  transaction.markSucceeded();
  transaction.releaseDomainEvents();
  return transaction;
}

describe('RefundPaymentUseCase', () => {
  it('refunds a Succeeded transaction: calls the gateway with its externalReference, persists Refunded, dispatches RefundIssued', async () => {
    const transaction = buildSucceededTransaction('pi_test_abc');
    const repository = new FakePaymentTransactionRepository(transaction);
    const gateway = new FakeGateway({ succeeded: true });
    const dispatcher = new RecordingDispatcher();
    const useCase = new RefundPaymentUseCase(repository, gateway, dispatcher);

    const result = await useCase.execute(new RefundPaymentCommand({ paymentTransactionId: transaction.getId() }));

    assert.equal(result.getStatus(), PaymentStatus.Refunded);
    assert.equal(gateway.refundCallCount, 1);
    assert.equal(gateway.lastRefundRequest?.externalReference, 'pi_test_abc');
    assert.equal(repository.saved.length, 1);
    assert.equal(repository.saved[0]?.getStatus(), PaymentStatus.Refunded);
    assert.equal(dispatcher.dispatched.length, 1);
    assert.ok(dispatcher.dispatched[0] instanceof RefundIssuedEvent);
    assert.equal((dispatcher.dispatched[0] as RefundIssuedEvent).paymentTransactionId, transaction.getId());
  });

  it('refunds a Settled transaction the same way as a Succeeded one', async () => {
    const transaction = buildSucceededTransaction('pi_test_settled');
    transaction.settle();
    transaction.releaseDomainEvents();
    const repository = new FakePaymentTransactionRepository(transaction);
    const gateway = new FakeGateway({ succeeded: true });
    const useCase = new RefundPaymentUseCase(repository, gateway, new RecordingDispatcher());

    const result = await useCase.execute(new RefundPaymentCommand({ paymentTransactionId: transaction.getId() }));

    assert.equal(result.getStatus(), PaymentStatus.Refunded);
    assert.equal(gateway.refundCallCount, 1);
  });

  it('throws NotFoundError when the transaction does not exist', async () => {
    const repository = new FakePaymentTransactionRepository(null);
    const gateway = new FakeGateway();
    const useCase = new RefundPaymentUseCase(repository, gateway, new RecordingDispatcher());

    await assert.rejects(
      () => useCase.execute(new RefundPaymentCommand({ paymentTransactionId: '99999999-9999-4999-8999-999999999999' })),
      NotFoundError,
    );
    assert.equal(gateway.refundCallCount, 0);
    assert.equal(repository.saved.length, 0);
  });

  it('rejects refunding an Initiated (never-succeeded) transaction, never calling the gateway', async () => {
    const transaction = PaymentTransaction.initiate({
      idempotencyKey: 'idem-key-refund-2',
      consultationSessionId: '11111111-1111-4111-8111-111111111111',
      patientId: '22222222-2222-4222-8222-222222222222',
      doctorId: '33333333-3333-4333-8333-333333333333',
      amount: Money.create(500, 'EGP'),
      paymentMethod: PaymentMethod.Card,
    });
    const repository = new FakePaymentTransactionRepository(transaction);
    const gateway = new FakeGateway();
    const useCase = new RefundPaymentUseCase(repository, gateway, new RecordingDispatcher());

    await assert.rejects(
      () => useCase.execute(new RefundPaymentCommand({ paymentTransactionId: transaction.getId() })),
      PaymentDomainError,
    );
    assert.equal(gateway.refundCallCount, 0, 'the gateway must never be called for a domain-invalid refund');
    assert.equal(repository.saved.length, 0, 'nothing should be persisted when the domain transition itself failed');
  });

  it('rejects refunding an already-Refunded transaction (not idempotent-replay, a hard domain error)', async () => {
    const transaction = buildSucceededTransaction('pi_test_already');
    transaction.refund();
    transaction.releaseDomainEvents();
    const repository = new FakePaymentTransactionRepository(transaction);
    const gateway = new FakeGateway();
    const useCase = new RefundPaymentUseCase(repository, gateway, new RecordingDispatcher());

    await assert.rejects(
      () => useCase.execute(new RefundPaymentCommand({ paymentTransactionId: transaction.getId() })),
      PaymentDomainError,
    );
    assert.equal(gateway.refundCallCount, 0);
  });

  it('does not persist Refunded when the gateway call fails -- the transaction stays retryable', async () => {
    const transaction = buildSucceededTransaction('pi_test_gateway_fails');
    const repository = new FakePaymentTransactionRepository(transaction);
    const gateway = new FakeGateway(new Error('Stripe network error'));
    const useCase = new RefundPaymentUseCase(repository, gateway, new RecordingDispatcher());

    await assert.rejects(
      () => useCase.execute(new RefundPaymentCommand({ paymentTransactionId: transaction.getId() })),
      /Stripe network error/,
    );
    assert.equal(gateway.refundCallCount, 1);
    assert.equal(repository.saved.length, 0, 'a failed gateway call must never be persisted as Refunded');
  });
});
