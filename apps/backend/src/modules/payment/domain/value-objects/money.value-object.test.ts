import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PaymentDomainError } from '../exceptions/payment-domain.error.js';

import { Money } from './money.value-object.js';

describe('Money', () => {
  it('creates with a positive amount and uppercased currency', () => {
    const money = Money.create(100, 'egp');
    assert.equal(money.getAmount(), 100);
    assert.equal(money.getCurrency(), 'EGP');
  });

  it('rejects a zero or negative amount', () => {
    assert.throws(() => Money.create(0, 'EGP'), PaymentDomainError);
    assert.throws(() => Money.create(-5, 'EGP'), PaymentDomainError);
  });

  it('rejects an empty currency', () => {
    assert.throws(() => Money.create(100, ''), PaymentDomainError);
  });

  it('compares equality by amount and currency', () => {
    const a = Money.create(100, 'EGP');
    const b = Money.create(100, 'egp');
    const c = Money.create(200, 'EGP');
    assert.ok(a.equals(b));
    assert.ok(!a.equals(c));
  });
});
