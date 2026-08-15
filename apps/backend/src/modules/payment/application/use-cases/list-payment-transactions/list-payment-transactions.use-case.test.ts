import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import type { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';
import { Money } from '../../../domain/value-objects/money.value-object.js';

import { ListPaymentTransactionsQuery } from './list-payment-transactions.query.js';
import { ListPaymentTransactionsUseCase } from './list-payment-transactions.use-case.js';

class FakePaymentTransactionRepository implements PaymentTransactionRepository {
  public lastFindAllOptions: { limit: number; offset: number } | undefined;
  constructor(private readonly transactions: PaymentTransaction[], private readonly total: number) {}

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
  async findAll(options: { limit: number; offset: number }): Promise<{ transactions: PaymentTransaction[]; total: number }> {
    this.lastFindAllOptions = options;
    return { transactions: this.transactions, total: this.total };
  }
  async save(): Promise<void> {}
}

function buildTransaction(appointmentId: string): PaymentTransaction {
  return PaymentTransaction.initiate({
    idempotencyKey: `idem-${appointmentId}`,
    appointmentId,
    patientId: '11111111-1111-4111-8111-111111111111',
    doctorId: '22222222-2222-4222-8222-222222222222',
    amount: Money.create(500, 'EGP'),
    paymentMethod: PaymentMethod.Card,
  });
}

describe('ListPaymentTransactionsUseCase', () => {
  it('converts page/limit into a limit/offset repository call and returns its result unchanged', async () => {
    const transactions = [buildTransaction('99999999-9999-4999-8999-999999999999')];
    const repository = new FakePaymentTransactionRepository(transactions, 1);
    const useCase = new ListPaymentTransactionsUseCase(repository);

    const result = await useCase.execute(new ListPaymentTransactionsQuery({ page: 1, limit: 20 }));

    assert.deepEqual(repository.lastFindAllOptions, { limit: 20, offset: 0 });
    assert.equal(result.total, 1);
    assert.equal(result.transactions, transactions);
  });

  it('computes offset from page > 1', async () => {
    const repository = new FakePaymentTransactionRepository([], 0);
    const useCase = new ListPaymentTransactionsUseCase(repository);

    await useCase.execute(new ListPaymentTransactionsQuery({ page: 3, limit: 20 }));

    assert.deepEqual(repository.lastFindAllOptions, { limit: 20, offset: 40 });
  });
});
