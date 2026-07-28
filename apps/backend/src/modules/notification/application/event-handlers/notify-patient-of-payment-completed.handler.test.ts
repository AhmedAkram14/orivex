import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PaymentTransaction } from '../../../payment/domain/entities/payment-transaction.entity.js';
import { PaymentMethod } from '../../../payment/domain/enums/payment-method.enum.js';
import { Money } from '../../../payment/domain/value-objects/money.value-object.js';
import { GetPaymentTransactionByIdUseCase } from '../../../payment/application/use-cases/get-payment-transaction-by-id/get-payment-transaction-by-id.use-case.js';
import type { PaymentTransactionRepository } from '../../../payment/domain/repositories/payment-transaction.repository.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import type { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

import { NotifyPatientOfPaymentCompletedHandler } from './notify-patient-of-payment-completed.handler.js';

class FakePaymentTransactionRepository implements PaymentTransactionRepository {
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
  async save(): Promise<void> {}
}

class FakePatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profile: PatientProfile | null) {}
  async findById(id: string): Promise<PatientProfile | null> {
    return this.profile && this.profile.getId() === id ? this.profile : null;
  }
  async findByAccountId(): Promise<PatientProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class FakeNotificationRepository implements NotificationRepository {
  public saved: Notification[] = [];
  async findById(): Promise<Notification | null> {
    return null;
  }
  async findByAccountId(): Promise<Notification[]> {
    return [];
  }
  async findByAccountIdPage(): Promise<Notification[]> {
    return [];
  }
  async countByAccountId(): Promise<number> {
    return 0;
  }
  async save(notification: Notification): Promise<void> {
    this.saved.push(notification);
  }
}

class FakeLogger {
  public errors: unknown[] = [];
  error(message: unknown, ...rest: unknown[]): void {
    this.errors.push({ message, rest });
  }
}

function buildSucceededTransaction(patientId: string): PaymentTransaction {
  const transaction = PaymentTransaction.initiate({
    idempotencyKey: 'idem-1',
    patientId,
    doctorId: '33333333-3333-4333-8333-333333333333',
    amount: Money.create(500, 'EGP'),
    paymentMethod: PaymentMethod.Card,
  });
  transaction.markSucceeded();
  return transaction;
}

describe('NotifyPatientOfPaymentCompletedHandler', () => {
  it("notifies the patient's own account with the paid amount", async () => {
    const patient = PatientProfile.create({ accountId: '55555555-5555-4555-8555-555555555555' });
    const transaction = buildSucceededTransaction(patient.getId());

    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyPatientOfPaymentCompletedHandler(
      new GetPaymentTransactionByIdUseCase(new FakePaymentTransactionRepository(transaction)),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(patient)),
      notificationRepo,
      logger as never,
    );

    await handler.handle({ paymentTransactionId: transaction.getId() });

    assert.equal(notificationRepo.saved.length, 1);
    const notification = notificationRepo.saved[0];
    assert.equal(notification.getAccountId(), patient.getAccountId());
    assert.equal(notification.getTitle(), 'Payment received');
    assert.match(notification.getDescription(), /500 EGP/);
    assert.equal(logger.errors.length, 0);
  });

  it('is a silent no-op for an unknown transaction id (never throws)', async () => {
    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyPatientOfPaymentCompletedHandler(
      new GetPaymentTransactionByIdUseCase(new FakePaymentTransactionRepository(null)),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(null)),
      notificationRepo,
      logger as never,
    );

    await handler.handle({ paymentTransactionId: '99999999-9999-4999-8999-999999999999' });

    assert.equal(notificationRepo.saved.length, 0);
    assert.equal(logger.errors.length, 0);
  });
});
