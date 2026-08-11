import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DomainEvent } from '../../../../../shared/domain/domain-event.js';
import { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import { PaymentStatus } from '../../../domain/enums/payment-status.enum.js';
import type { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';
import { Money } from '../../../domain/value-objects/money.value-object.js';

import { ReconcileStripeWebhookEventCommand } from './reconcile-stripe-webhook-event.command.js';
import { ReconcileStripeWebhookEventUseCase } from './reconcile-stripe-webhook-event.use-case.js';

class FakePaymentTransactionRepository implements PaymentTransactionRepository {
  public readonly saved: PaymentTransaction[] = [];
  private readonly byExternalReference = new Map<string, PaymentTransaction>();
  seed(transaction: PaymentTransaction): void {
    const ref = transaction.getExternalReference();
    if (ref) this.byExternalReference.set(ref, transaction);
  }
  async findById(): Promise<PaymentTransaction | null> {
    return null;
  }
  async findByIdempotencyKey(): Promise<PaymentTransaction | null> {
    return null;
  }
  async findByExternalReference(externalReference: string): Promise<PaymentTransaction | null> {
    return this.byExternalReference.get(externalReference) ?? null;
  }
  async findByConsultationSessionId(): Promise<PaymentTransaction | null> {
    return null;
  }
  async findByAppointmentId(): Promise<PaymentTransaction | null> {
    return null;
  }
  async save(transaction: PaymentTransaction): Promise<void> {
    this.saved.push(transaction);
  }
}

class RecordingDispatcher {
  public readonly dispatched: DomainEvent[] = [];
  async dispatch(events: DomainEvent[]): Promise<void> {
    this.dispatched.push(...events);
  }
  subscribe(): void {}
}

function buildInitiatedTransaction(externalReference: string): PaymentTransaction {
  const transaction = PaymentTransaction.initiate({
    idempotencyKey: `idem-key-${externalReference}`,
    appointmentId: '99999999-9999-4999-8999-999999999999',
    consultationSessionId: '11111111-1111-4111-8111-111111111111',
    patientId: '22222222-2222-4222-8222-222222222222',
    doctorId: '33333333-3333-4333-8333-333333333333',
    amount: Money.create(500, 'EGP'),
    paymentMethod: PaymentMethod.Card,
  });
  transaction.attachExternalReference(externalReference);
  return transaction;
}

describe('ReconcileStripeWebhookEventUseCase', () => {
  it('is a silent no-op for an unknown externalReference (never throws)', async () => {
    const repository = new FakePaymentTransactionRepository();
    const dispatcher = new RecordingDispatcher();
    const useCase = new ReconcileStripeWebhookEventUseCase(repository, dispatcher);

    await useCase.execute(new ReconcileStripeWebhookEventCommand({ externalReference: 'pi_unknown', outcome: 'succeeded' }));

    assert.equal(repository.saved.length, 0);
    assert.equal(dispatcher.dispatched.length, 0);
  });

  it('marks an Initiated transaction Succeeded on a "succeeded" event and persists it', async () => {
    const transaction = buildInitiatedTransaction('pi_succeed_1');
    const repository = new FakePaymentTransactionRepository();
    repository.seed(transaction);
    const dispatcher = new RecordingDispatcher();
    const useCase = new ReconcileStripeWebhookEventUseCase(repository, dispatcher);

    await useCase.execute(new ReconcileStripeWebhookEventCommand({ externalReference: 'pi_succeed_1', outcome: 'succeeded' }));

    assert.equal(transaction.getStatus(), PaymentStatus.Succeeded);
    assert.equal(repository.saved.length, 1);
    assert.equal(dispatcher.dispatched.length, 1, 'PaymentCompletedEvent should be dispatched');
  });

  it('marks an Initiated transaction Failed on a "failed" event and persists it', async () => {
    const transaction = buildInitiatedTransaction('pi_fail_1');
    const repository = new FakePaymentTransactionRepository();
    repository.seed(transaction);
    const dispatcher = new RecordingDispatcher();
    const useCase = new ReconcileStripeWebhookEventUseCase(repository, dispatcher);

    await useCase.execute(new ReconcileStripeWebhookEventCommand({ externalReference: 'pi_fail_1', outcome: 'failed' }));

    assert.equal(transaction.getStatus(), PaymentStatus.Failed);
    assert.equal(repository.saved.length, 1);
    assert.equal(dispatcher.dispatched.length, 0, 'markFailed() records no domain event');
  });

  it('is idempotent: a duplicate "succeeded" delivery for an already-Succeeded transaction never re-saves or re-dispatches', async () => {
    const transaction = buildInitiatedTransaction('pi_succeed_2');
    transaction.markSucceeded();
    transaction.releaseDomainEvents();
    const repository = new FakePaymentTransactionRepository();
    repository.seed(transaction);
    const dispatcher = new RecordingDispatcher();
    const useCase = new ReconcileStripeWebhookEventUseCase(repository, dispatcher);

    // Simulate Stripe redelivering the same event (common at-least-once
    // webhook semantics) -- must never throw, never double-save.
    await useCase.execute(new ReconcileStripeWebhookEventCommand({ externalReference: 'pi_succeed_2', outcome: 'succeeded' }));

    assert.equal(transaction.getStatus(), PaymentStatus.Succeeded);
    assert.equal(repository.saved.length, 0);
    assert.equal(dispatcher.dispatched.length, 0);
  });

  it('is idempotent: a duplicate "failed" delivery for an already-Failed transaction never re-saves', async () => {
    const transaction = buildInitiatedTransaction('pi_fail_2');
    transaction.markFailed();
    const repository = new FakePaymentTransactionRepository();
    repository.seed(transaction);
    const useCase = new ReconcileStripeWebhookEventUseCase(repository, new RecordingDispatcher());

    await useCase.execute(new ReconcileStripeWebhookEventCommand({ externalReference: 'pi_fail_2', outcome: 'failed' }));

    assert.equal(transaction.getStatus(), PaymentStatus.Failed);
    assert.equal(repository.saved.length, 0);
  });

  it('a "refunded" event never mutates anything -- refunds are only ever applied via RefundPaymentUseCase, this is confirmation-only', async () => {
    const transaction = buildInitiatedTransaction('pi_refund_1');
    transaction.markSucceeded();
    transaction.releaseDomainEvents();
    const repository = new FakePaymentTransactionRepository();
    repository.seed(transaction);
    const useCase = new ReconcileStripeWebhookEventUseCase(repository, new RecordingDispatcher());

    await useCase.execute(new ReconcileStripeWebhookEventCommand({ externalReference: 'pi_refund_1', outcome: 'refunded' }));

    assert.equal(transaction.getStatus(), PaymentStatus.Succeeded, 'status must be untouched by a refunded webhook event');
    assert.equal(repository.saved.length, 0);
  });

  it('a "succeeded" event for a transaction already in a different terminal state (e.g. Refunded) is a no-op, not an error', async () => {
    const transaction = buildInitiatedTransaction('pi_weird_order');
    transaction.markSucceeded();
    transaction.refund();
    transaction.releaseDomainEvents();
    const repository = new FakePaymentTransactionRepository();
    repository.seed(transaction);
    const useCase = new ReconcileStripeWebhookEventUseCase(repository, new RecordingDispatcher());

    await useCase.execute(new ReconcileStripeWebhookEventCommand({ externalReference: 'pi_weird_order', outcome: 'succeeded' }));

    assert.equal(transaction.getStatus(), PaymentStatus.Refunded);
    assert.equal(repository.saved.length, 0);
  });
});
