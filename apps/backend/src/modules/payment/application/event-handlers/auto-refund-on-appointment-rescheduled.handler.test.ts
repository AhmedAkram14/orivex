import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { PaymentTransaction } from '../../domain/entities/payment-transaction.entity.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';
import { PaymentStatus } from '../../domain/enums/payment-status.enum.js';
import type { PaymentTransactionRepository } from '../../domain/repositories/payment-transaction.repository.js';
import { Money } from '../../domain/value-objects/money.value-object.js';
import type {
  AuthorizePaymentRequest,
  AuthorizePaymentResult,
  PaymentGatewayPort,
  RefundPaymentRequest,
  RefundPaymentResult,
} from '../ports/payment-gateway.port.js';
import { RefundPaymentUseCase } from '../use-cases/refund-payment/refund-payment.use-case.js';

import { AutoRefundOnAppointmentRescheduledHandler } from './auto-refund-on-appointment-rescheduled.handler.js';

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
  async findByAppointmentId(appointmentId: string): Promise<PaymentTransaction | null> {
    return this.transaction && this.transaction.getAppointmentId() === appointmentId ? this.transaction : null;
  }
  async findAll(): Promise<{ transactions: PaymentTransaction[]; total: number }> {
    return { transactions: [], total: 0 };
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

class FakeLogger {
  public errors: unknown[] = [];
  error(message: unknown, ...rest: unknown[]): void {
    this.errors.push({ message, rest });
  }
}

const OLD_APPOINTMENT_ID = '99999999-9999-4999-8999-999999999999';

function buildSucceededTransaction(externalReference = 'pi_test_123'): PaymentTransaction {
  const transaction = PaymentTransaction.initiate({
    idempotencyKey: 'idem-key-reschedule-1',
    appointmentId: OLD_APPOINTMENT_ID,
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

describe('AutoRefundOnAppointmentRescheduledHandler', () => {
  it('refunds the old appointment\'s Succeeded payment transaction', async () => {
    const transaction = buildSucceededTransaction('pi_reschedule_abc');
    const repository = new FakePaymentTransactionRepository(transaction);
    const gateway = new FakeGateway({ succeeded: true });
    const refundPaymentUseCase = new RefundPaymentUseCase(repository, gateway, new RecordingDispatcher());
    const logger = new FakeLogger();
    const handler = new AutoRefundOnAppointmentRescheduledHandler(repository, refundPaymentUseCase, logger as never);

    await handler.handle({ oldAppointmentId: OLD_APPOINTMENT_ID, newAppointmentId: '44444444-4444-4444-8444-444444444444' });

    assert.equal(gateway.refundCallCount, 1);
    assert.equal(gateway.lastRefundRequest?.externalReference, 'pi_reschedule_abc');
    assert.equal(repository.saved.length, 1);
    assert.equal(repository.saved[0]?.getStatus(), PaymentStatus.Refunded);
    assert.equal(logger.errors.length, 0);
  });

  it('no-ops without throwing when no payment transaction exists for the old appointment (free/unpaid)', async () => {
    const repository = new FakePaymentTransactionRepository(null);
    const gateway = new FakeGateway();
    const refundPaymentUseCase = new RefundPaymentUseCase(repository, gateway, new RecordingDispatcher());
    const logger = new FakeLogger();
    const handler = new AutoRefundOnAppointmentRescheduledHandler(repository, refundPaymentUseCase, logger as never);

    await handler.handle({ oldAppointmentId: OLD_APPOINTMENT_ID, newAppointmentId: '44444444-4444-4444-8444-444444444444' });

    assert.equal(gateway.refundCallCount, 0);
    assert.equal(logger.errors.length, 0);
  });

  it('safely swallows a replayed event hitting an already-Refunded transaction (no double refund, no throw)', async () => {
    const transaction = buildSucceededTransaction('pi_reschedule_already');
    transaction.refund();
    transaction.releaseDomainEvents();
    const repository = new FakePaymentTransactionRepository(transaction);
    const gateway = new FakeGateway();
    const refundPaymentUseCase = new RefundPaymentUseCase(repository, gateway, new RecordingDispatcher());
    const logger = new FakeLogger();
    const handler = new AutoRefundOnAppointmentRescheduledHandler(repository, refundPaymentUseCase, logger as never);

    // Already Refunded -> the defensive status check itself no-ops before
    // ever reaching RefundPaymentUseCase/the gateway.
    await handler.handle({ oldAppointmentId: OLD_APPOINTMENT_ID, newAppointmentId: '44444444-4444-4444-8444-444444444444' });

    assert.equal(gateway.refundCallCount, 0);
    assert.equal(logger.errors.length, 0);
  });

  it('logs and swallows a gateway failure instead of throwing (reschedule already saved, must not be corrupted)', async () => {
    const transaction = buildSucceededTransaction('pi_reschedule_fails');
    const repository = new FakePaymentTransactionRepository(transaction);
    const gateway = new FakeGateway(new Error('Stripe network error'));
    const refundPaymentUseCase = new RefundPaymentUseCase(repository, gateway, new RecordingDispatcher());
    const logger = new FakeLogger();
    const handler = new AutoRefundOnAppointmentRescheduledHandler(repository, refundPaymentUseCase, logger as never);

    await handler.handle({ oldAppointmentId: OLD_APPOINTMENT_ID, newAppointmentId: '44444444-4444-4444-8444-444444444444' });

    assert.equal(gateway.refundCallCount, 1);
    assert.equal(repository.saved.length, 0, 'a failed gateway call must never be persisted as Refunded');
    assert.equal(logger.errors.length, 1, 'the failure must be logged, not thrown');
  });
});
