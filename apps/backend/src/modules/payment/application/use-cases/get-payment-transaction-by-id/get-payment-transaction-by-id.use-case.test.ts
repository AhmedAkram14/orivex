import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import type { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';
import { Money } from '../../../domain/value-objects/money.value-object.js';

import { GetPaymentTransactionByIdUseCase } from './get-payment-transaction-by-id.use-case.js';

class FakePaymentTransactionRepository implements PaymentTransactionRepository {
  constructor(private readonly transaction: PaymentTransaction | null) {}
  async findById(): Promise<PaymentTransaction | null> {
    return this.transaction;
  }
  async findByIdempotencyKey(): Promise<PaymentTransaction | null> {
    return this.transaction;
  }
  async findByExternalReference(): Promise<PaymentTransaction | null> {
    return this.transaction;
  }
  async findByConsultationSessionId(): Promise<PaymentTransaction | null> {
    return this.transaction;
  }
  async findByAppointmentId(): Promise<PaymentTransaction | null> {
    return this.transaction;
  }
  async save(): Promise<void> {}
}

describe('GetPaymentTransactionByIdUseCase', () => {
  it('returns the transaction when it exists', async () => {
    const transaction = PaymentTransaction.initiate({
      idempotencyKey: 'idem-key-1',
      appointmentId: '99999999-9999-4999-8999-999999999999',
      patientId: '11111111-1111-4111-8111-111111111111',
      doctorId: '22222222-2222-4222-8222-222222222222',
      amount: Money.create(500, 'EGP'),
      paymentMethod: PaymentMethod.Card,
    });
    const useCase = new GetPaymentTransactionByIdUseCase(new FakePaymentTransactionRepository(transaction));

    const result = await useCase.execute({ paymentTransactionId: transaction.getId() });

    assert.equal(result?.getId(), transaction.getId());
  });

  it('returns null (not a thrown error) when the transaction does not exist', async () => {
    const useCase = new GetPaymentTransactionByIdUseCase(new FakePaymentTransactionRepository(null));

    const result = await useCase.execute({ paymentTransactionId: '99999999-9999-4999-8999-999999999999' });

    assert.equal(result, null);
  });
});
