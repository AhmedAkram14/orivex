import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import { PaymentStatus } from '../../../domain/enums/payment-status.enum.js';
import type { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';
import { Money } from '../../../domain/value-objects/money.value-object.js';

import { GetDoctorEarningsTransactionsUseCase } from './get-doctor-earnings-transactions.use-case.js';

const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';

class FakePaymentTransactionRepository implements PaymentTransactionRepository {
  public calls: Array<{ doctorId: string; range?: { from?: Date; to?: Date } }> = [];

  constructor(private readonly transactions: PaymentTransaction[]) {}

  async findById(): Promise<PaymentTransaction | null> {
    return null;
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
  async findByAppointmentId(): Promise<PaymentTransaction | null> {
    return null;
  }
  async findByDoctorId(doctorId: string, range?: { from?: Date; to?: Date }): Promise<PaymentTransaction[]> {
    this.calls.push({ doctorId, range });
    return this.transactions
      .filter((transaction) => {
        const createdAt = transaction.getCreatedAt();
        if (range?.from && createdAt < range.from) return false;
        if (range?.to && createdAt >= range.to) return false;
        return true;
      })
      .sort((a, b) => b.getCreatedAt().getTime() - a.getCreatedAt().getTime());
  }
  async findAll(): Promise<{ transactions: PaymentTransaction[]; total: number }> {
    return { transactions: [], total: 0 };
  }
  async save(): Promise<void> {}
}

function buildTransaction(options: {
  id: string;
  amount: number;
  status: PaymentStatus;
  createdAt: Date;
}): PaymentTransaction {
  return PaymentTransaction.reconstitute({
    id: options.id,
    idempotencyKey: `idem-${options.id}`,
    appointmentId: `appointment-${options.id}`,
    patientId: '11111111-1111-4111-8111-111111111111',
    doctorId: DOCTOR_ID,
    amount: Money.create(options.amount, 'EGP'),
    paymentMethod: PaymentMethod.Card,
    status: options.status,
    createdAt: options.createdAt,
    updatedAt: options.createdAt,
  });
}

describe('GetDoctorEarningsTransactionsUseCase', () => {
  it('returns every status in range, including Refunded, unlike the summary use case', async () => {
    const succeeded = buildTransaction({
      id: 'succeeded',
      amount: 500,
      status: PaymentStatus.Succeeded,
      createdAt: new Date('2026-09-05T00:00:00.000Z'),
    });
    const refunded = buildTransaction({
      id: 'refunded',
      amount: 700,
      status: PaymentStatus.Refunded,
      createdAt: new Date('2026-09-06T00:00:00.000Z'),
    });
    const failed = buildTransaction({
      id: 'failed',
      amount: 300,
      status: PaymentStatus.Failed,
      createdAt: new Date('2026-09-07T00:00:00.000Z'),
    });
    const repository = new FakePaymentTransactionRepository([succeeded, refunded, failed]);
    const useCase = new GetDoctorEarningsTransactionsUseCase(repository);

    const result = await useCase.execute({
      doctorId: DOCTOR_ID,
      dateFrom: new Date('2026-09-01T00:00:00.000Z'),
      dateTo: new Date('2026-10-01T00:00:00.000Z'),
    });

    assert.equal(result.length, 3);
    assert.deepEqual(
      result.map((transaction) => transaction.getId()),
      ['failed', 'refunded', 'succeeded'],
    );
    assert.ok(result.some((transaction) => transaction.getStatus() === PaymentStatus.Refunded));
  });

  it('scopes results to the given date range', async () => {
    const outsideRange = buildTransaction({
      id: 'outside',
      amount: 1000,
      status: PaymentStatus.Succeeded,
      createdAt: new Date('2026-01-15T00:00:00.000Z'),
    });
    const insideRange = buildTransaction({
      id: 'inside',
      amount: 500,
      status: PaymentStatus.Succeeded,
      createdAt: new Date('2026-09-10T00:00:00.000Z'),
    });
    const repository = new FakePaymentTransactionRepository([outsideRange, insideRange]);
    const useCase = new GetDoctorEarningsTransactionsUseCase(repository);

    const result = await useCase.execute({
      doctorId: DOCTOR_ID,
      dateFrom: new Date('2026-09-01T00:00:00.000Z'),
      dateTo: new Date('2026-10-01T00:00:00.000Z'),
    });

    assert.equal(result.length, 1);
    assert.equal(result[0]?.getId(), 'inside');
    assert.deepEqual(repository.calls[0]?.range, {
      from: new Date('2026-09-01T00:00:00.000Z'),
      to: new Date('2026-10-01T00:00:00.000Z'),
    });
  });

  it('scopes to the requesting doctor only', async () => {
    const mine = buildTransaction({
      id: 'mine',
      amount: 500,
      status: PaymentStatus.Succeeded,
      createdAt: new Date('2026-09-10T00:00:00.000Z'),
    });
    const repository = new FakePaymentTransactionRepository([mine]);
    const useCase = new GetDoctorEarningsTransactionsUseCase(repository);

    await useCase.execute({
      doctorId: DOCTOR_ID,
      dateFrom: new Date('2026-09-01T00:00:00.000Z'),
      dateTo: new Date('2026-10-01T00:00:00.000Z'),
    });

    assert.equal(repository.calls[0]?.doctorId, DOCTOR_ID);
  });
});
