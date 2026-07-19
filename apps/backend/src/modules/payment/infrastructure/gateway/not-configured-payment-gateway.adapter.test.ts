import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PaymentDomainError } from '../../domain/exceptions/payment-domain.error.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';

import { NotConfiguredPaymentGatewayAdapter } from './not-configured-payment-gateway.adapter.js';

describe('NotConfiguredPaymentGatewayAdapter', () => {
  it('throws explicitly when authorize() is invoked, never fabricating an outcome', async () => {
    const adapter = new NotConfiguredPaymentGatewayAdapter();

    await assert.rejects(
      () =>
        adapter.authorize({
          amount: 500,
          currency: 'EGP',
          paymentMethod: PaymentMethod.Card,
          paymentMethodToken: 'pm_test_card',
        }),
      PaymentDomainError,
    );
  });

  it('throws explicitly when refund() is invoked, never fabricating an outcome', async () => {
    const adapter = new NotConfiguredPaymentGatewayAdapter();

    await assert.rejects(() => adapter.refund({ externalReference: 'pi_test' }), PaymentDomainError);
  });
});
