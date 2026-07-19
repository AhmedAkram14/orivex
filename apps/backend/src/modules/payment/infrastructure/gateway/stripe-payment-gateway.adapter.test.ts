import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import Stripe from 'stripe';

import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';

import { StripePaymentGatewayAdapter, toMinorUnits, toStripePaymentMethodType, type StripeClient } from './stripe-payment-gateway.adapter.js';

// Hand-written fake matching this codebase's no-mocking-library convention
// -- implements only the narrow `StripeClient` slice the adapter actually
// calls, letting each test control exactly what the Stripe API "returns"
// without a real network call or a mocking framework.
class FakeStripeClient implements StripeClient {
  public lastPaymentIntentCreateParams: Stripe.PaymentIntentCreateParams | undefined;
  public lastRefundCreateParams: Stripe.RefundCreateParams | undefined;

  constructor(
    private readonly paymentIntentResult: { status: Stripe.PaymentIntent.Status; id: string } | Error,
    private readonly refundResult?: { status: string },
  ) {}

  paymentIntents = {
    create: async (params: Stripe.PaymentIntentCreateParams) => {
      this.lastPaymentIntentCreateParams = params;
      if (this.paymentIntentResult instanceof Error) {
        throw this.paymentIntentResult;
      }
      return this.paymentIntentResult as Stripe.PaymentIntent;
    },
  } as unknown as StripeClient['paymentIntents'];

  refunds = {
    create: async (params: Stripe.RefundCreateParams) => {
      this.lastRefundCreateParams = params;
      if (!this.refundResult) {
        throw new Error('refundResult not configured for this fake');
      }
      return this.refundResult as Stripe.Refund;
    },
  } as unknown as StripeClient['refunds'];
}

function buildCardError(message = 'Your card was declined.'): Stripe.errors.StripeCardError {
  return new Stripe.errors.StripeCardError({ message, type: 'StripeCardError' } as never);
}

describe('StripePaymentGatewayAdapter.authorize', () => {
  it('returns succeeded=true with the PaymentIntent id as externalReference on a successful charge', async () => {
    const client = new FakeStripeClient({ status: 'succeeded', id: 'pi_123' });
    const adapter = new StripePaymentGatewayAdapter(client);

    const result = await adapter.authorize({
      amount: 500,
      currency: 'EGP',
      paymentMethod: PaymentMethod.Card,
      paymentMethodToken: 'pm_test_card',
    });

    assert.deepEqual(result, { succeeded: true, externalReference: 'pi_123' });
  });

  it('returns succeeded=false (with no externalReference) when the PaymentIntent does not reach succeeded', async () => {
    const client = new FakeStripeClient({ status: 'requires_payment_method', id: 'pi_456' });
    const adapter = new StripePaymentGatewayAdapter(client);

    const result = await adapter.authorize({
      amount: 500,
      currency: 'EGP',
      paymentMethod: PaymentMethod.Card,
      paymentMethodToken: 'pm_test_card',
    });

    assert.equal(result.succeeded, false);
    // Still reports the reference -- a non-succeeded PaymentIntent can
    // still be reconciled later via the webhook receiver.
    assert.equal(result.externalReference, 'pi_456');
  });

  it('returns succeeded=false (never throwing) when Stripe reports a card decline', async () => {
    const client = new FakeStripeClient(buildCardError('Your card has insufficient funds.'));
    const adapter = new StripePaymentGatewayAdapter(client);

    const result = await adapter.authorize({
      amount: 500,
      currency: 'EGP',
      paymentMethod: PaymentMethod.Card,
      paymentMethodToken: 'pm_test_card',
    });

    assert.deepEqual(result, { succeeded: false });
  });

  it('propagates a non-card Stripe error (e.g. authentication/config failure) rather than swallowing it', async () => {
    const client = new FakeStripeClient(new Stripe.errors.StripeAuthenticationError({ message: 'Invalid API key.' } as never));
    const adapter = new StripePaymentGatewayAdapter(client);

    await assert.rejects(
      () =>
        adapter.authorize({
          amount: 500,
          currency: 'EGP',
          paymentMethod: PaymentMethod.Card,
          paymentMethodToken: 'pm_test_card',
        }),
      Stripe.errors.StripeAuthenticationError,
    );
  });

  it('converts a decimal EGP amount to minor units (piastres) before calling Stripe', async () => {
    const client = new FakeStripeClient({ status: 'succeeded', id: 'pi_789' });
    const adapter = new StripePaymentGatewayAdapter(client);

    await adapter.authorize({
      amount: 12.5,
      currency: 'EGP',
      paymentMethod: PaymentMethod.Card,
      paymentMethodToken: 'pm_test_card',
    });

    assert.equal(client.lastPaymentIntentCreateParams?.amount, 1250);
    assert.equal(client.lastPaymentIntentCreateParams?.currency, 'egp');
  });

  it('passes the paymentMethodToken through as Stripe\'s payment_method, confirming in the same call', async () => {
    const client = new FakeStripeClient({ status: 'succeeded', id: 'pi_999' });
    const adapter = new StripePaymentGatewayAdapter(client);

    await adapter.authorize({
      amount: 500,
      currency: 'EGP',
      paymentMethod: PaymentMethod.Card,
      paymentMethodToken: 'pm_abc123',
    });

    assert.equal(client.lastPaymentIntentCreateParams?.payment_method, 'pm_abc123');
    assert.equal(client.lastPaymentIntentCreateParams?.confirm, true);
    assert.equal(client.lastPaymentIntentCreateParams?.error_on_requires_action, true);
  });
});

describe('StripePaymentGatewayAdapter.refund', () => {
  it('returns succeeded=true for a Stripe refund that settles immediately', async () => {
    const client = new FakeStripeClient({ status: 'succeeded', id: 'pi_1' }, { status: 'succeeded' });
    const adapter = new StripePaymentGatewayAdapter(client);

    const result = await adapter.refund({ externalReference: 'pi_1' });

    assert.deepEqual(result, { succeeded: true });
    assert.equal(client.lastRefundCreateParams?.payment_intent, 'pi_1');
  });

  it('returns succeeded=true for a refund still pending (e.g. a bank-transfer-backed method)', async () => {
    const client = new FakeStripeClient({ status: 'succeeded', id: 'pi_2' }, { status: 'pending' });
    const adapter = new StripePaymentGatewayAdapter(client);

    const result = await adapter.refund({ externalReference: 'pi_2' });

    assert.deepEqual(result, { succeeded: true });
  });

  it('returns succeeded=false for a failed refund', async () => {
    const client = new FakeStripeClient({ status: 'succeeded', id: 'pi_3' }, { status: 'failed' });
    const adapter = new StripePaymentGatewayAdapter(client);

    const result = await adapter.refund({ externalReference: 'pi_3' });

    assert.deepEqual(result, { succeeded: false });
  });
});

describe('toMinorUnits', () => {
  it('multiplies by 100 for a standard 2-decimal currency', () => {
    assert.equal(toMinorUnits(19.99, 'USD'), 1999);
    assert.equal(toMinorUnits(500, 'EGP'), 50000);
  });

  it('rounds to the nearest integer to avoid floating-point drift', () => {
    assert.equal(toMinorUnits(10.005, 'USD'), 1001);
  });

  it('does not multiply for a zero-decimal currency', () => {
    assert.equal(toMinorUnits(500, 'JPY'), 500);
    assert.equal(toMinorUnits(500, 'jpy'), 500);
  });
});

describe('toStripePaymentMethodType', () => {
  it('maps Card to "card"', () => {
    assert.equal(toStripePaymentMethodType(PaymentMethod.Card), 'card');
  });

  it('maps MobileWallet to "card" (Apple/Google Pay ride the card payment_method_type)', () => {
    assert.equal(toStripePaymentMethodType(PaymentMethod.MobileWallet), 'card');
  });
});
