import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import { PaymentStatus } from '../../../domain/enums/payment-status.enum.js';
import type { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';
import { Money } from '../../../domain/value-objects/money.value-object.js';

import { GetDoctorEarningsSummaryUseCase } from './get-doctor-earnings-summary.use-case.js';

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
    if (!range) {
      return this.transactions;
    }
    return this.transactions.filter((transaction) => {
      const createdAt = transaction.getCreatedAt();
      if (range.from && createdAt < range.from) return false;
      if (range.to && createdAt >= range.to) return false;
      return true;
    });
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

describe('GetDoctorEarningsSummaryUseCase', () => {
  it('keeps lifetime totals unaffected by a narrow dateFrom/dateTo range (the bug fix)', async () => {
    // One transaction well outside the requested range, one inside it --
    // lifetime figures must include both; only `cycles` should narrow.
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
    const useCase = new GetDoctorEarningsSummaryUseCase(repository);

    const result = await useCase.execute({
      doctorId: DOCTOR_ID,
      dateFrom: new Date('2026-09-01T00:00:00.000Z'),
      dateTo: new Date('2026-10-01T00:00:00.000Z'),
    });

    // Lifetime: both transactions count -- 1000 + 500 = 1500 gross,
    // 15% commission = 225, net = 1275.
    assert.equal(result.lifetimeGrossAmount, 1500);
    assert.equal(result.lifetimeCommissionAmount, 225);
    assert.equal(result.lifetimeNetAmount, 1275);
    assert.equal(result.lifetimeTransactionCount, 2);

    // Cycles: only the September transaction falls inside the range.
    assert.equal(result.cycles.length, 1);
    assert.equal(result.cycles[0]?.cycleLabel, '2026-09');
    assert.equal(result.cycles[0]?.grossAmount, 500);
    assert.equal(result.cycles[0]?.transactionCount, 1);
  });

  it('scopes cycles to the given range while lifetime uses an unfiltered fetch', async () => {
    const january = buildTransaction({
      id: 'jan',
      amount: 200,
      status: PaymentStatus.Settled,
      createdAt: new Date('2026-01-05T00:00:00.000Z'),
    });
    const september = buildTransaction({
      id: 'sep',
      amount: 300,
      status: PaymentStatus.Settled,
      createdAt: new Date('2026-09-05T00:00:00.000Z'),
    });
    const repository = new FakePaymentTransactionRepository([january, september]);
    const useCase = new GetDoctorEarningsSummaryUseCase(repository);

    const result = await useCase.execute({
      doctorId: DOCTOR_ID,
      dateFrom: new Date('2026-09-01T00:00:00.000Z'),
      dateTo: new Date('2026-10-01T00:00:00.000Z'),
    });

    assert.equal(result.cycles.length, 1);
    assert.equal(result.cycles[0]?.cycleLabel, '2026-09');
    assert.equal(result.lifetimeTransactionCount, 2);

    // The repository must be called once with no range (lifetime) and once
    // with the given range (cycles) -- never a single range-only call.
    assert.equal(repository.calls.length, 2);
    assert.equal(repository.calls[0]?.range, undefined);
    assert.deepEqual(repository.calls[1]?.range, {
      from: new Date('2026-09-01T00:00:00.000Z'),
      to: new Date('2026-10-01T00:00:00.000Z'),
    });
  });

  it('reuses the single unfiltered fetch for both lifetime and cycles when no range is given', async () => {
    const transaction = buildTransaction({
      id: 'only',
      amount: 400,
      status: PaymentStatus.Succeeded,
      createdAt: new Date('2026-09-05T00:00:00.000Z'),
    });
    const repository = new FakePaymentTransactionRepository([transaction]);
    const useCase = new GetDoctorEarningsSummaryUseCase(repository);

    const result = await useCase.execute({ doctorId: DOCTOR_ID });

    assert.equal(result.lifetimeTransactionCount, 1);
    assert.equal(result.cycles.length, 1);
    assert.equal(repository.calls.length, 1);
  });

  it('excludes a Refunded transaction from both lifetime and cycle sums', async () => {
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
    const repository = new FakePaymentTransactionRepository([succeeded, refunded]);
    const useCase = new GetDoctorEarningsSummaryUseCase(repository);

    const result = await useCase.execute({
      doctorId: DOCTOR_ID,
      dateFrom: new Date('2026-09-01T00:00:00.000Z'),
      dateTo: new Date('2026-10-01T00:00:00.000Z'),
    });

    assert.equal(result.lifetimeGrossAmount, 500);
    assert.equal(result.lifetimeTransactionCount, 1);
    assert.equal(result.cycles.length, 1);
    assert.equal(result.cycles[0]?.grossAmount, 500);
    assert.equal(result.cycles[0]?.transactionCount, 1);
  });
});
