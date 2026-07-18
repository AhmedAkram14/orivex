import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PaymentMethod } from '../enums/payment-method.enum.js';
import { PaymentStatus } from '../enums/payment-status.enum.js';
import { PaymentDomainError } from '../exceptions/payment-domain.error.js';
import { Money } from '../value-objects/money.value-object.js';

import { PaymentTransaction } from './payment-transaction.entity.js';

function initiateTransaction(): PaymentTransaction {
  return PaymentTransaction.initiate({
    idempotencyKey: 'idem-key-1',
    consultationSessionId: '11111111-1111-4111-8111-111111111111',
    patientId: '22222222-2222-4222-8222-222222222222',
    doctorId: '33333333-3333-4333-8333-333333333333',
    amount: Money.create(500, 'EGP'),
    paymentMethod: PaymentMethod.Card,
  });
}

describe('PaymentTransaction', () => {
  it('initiates in Initiated status', () => {
    const transaction = initiateTransaction();
    assert.equal(transaction.getStatus(), PaymentStatus.Initiated);
  });

  it('marks succeeded and records PaymentCompleted', () => {
    const transaction = initiateTransaction();
    transaction.markSucceeded();

    assert.equal(transaction.getStatus(), PaymentStatus.Succeeded);
    assert.equal(transaction.releaseDomainEvents().length, 1);
  });

  it('rejects succeeding a non-Initiated transaction', () => {
    const transaction = initiateTransaction();
    transaction.markSucceeded();
    assert.throws(() => transaction.markSucceeded(), PaymentDomainError);
  });

  it('marks failed with no domain event', () => {
    const transaction = initiateTransaction();
    transaction.markFailed();

    assert.equal(transaction.getStatus(), PaymentStatus.Failed);
    assert.equal(transaction.releaseDomainEvents().length, 0);
  });

  it('settles a Succeeded transaction', () => {
    const transaction = initiateTransaction();
    transaction.markSucceeded();
    transaction.settle();
    assert.equal(transaction.getStatus(), PaymentStatus.Settled);
  });

  it('rejects settling a non-Succeeded transaction', () => {
    const transaction = initiateTransaction();
    assert.throws(() => transaction.settle(), PaymentDomainError);
  });

  it('refunds a Succeeded or Settled transaction and records RefundIssued', () => {
    const transaction = initiateTransaction();
    transaction.markSucceeded();
    transaction.releaseDomainEvents();
    transaction.refund();

    assert.equal(transaction.getStatus(), PaymentStatus.Refunded);
    assert.equal(transaction.releaseDomainEvents().length, 1);
  });

  it('rejects refunding an Initiated or Failed transaction', () => {
    const transaction = initiateTransaction();
    assert.throws(() => transaction.refund(), PaymentDomainError);
  });

  it('disputes a Succeeded or Settled transaction', () => {
    const transaction = initiateTransaction();
    transaction.markSucceeded();
    transaction.dispute();
    assert.equal(transaction.getStatus(), PaymentStatus.Disputed);
  });

  it('rejects disputing an Initiated or Failed transaction', () => {
    const transaction = initiateTransaction();
    assert.throws(() => transaction.dispute(), PaymentDomainError);
  });
});
