import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import type {
  AuthorizePaymentRequest,
  AuthorizePaymentResult,
  PaymentGatewayPort,
  RefundPaymentRequest,
  RefundPaymentResult,
} from '../../application/ports/payment-gateway.port.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';

// The exact slice of the Stripe SDK this adapter actually calls -- narrowed
// down from the full `Stripe` client so a hand-written fake can implement
// it in tests (this codebase's established convention: no mocking
// library, a real object implementing the real shape) without needing to
// stub Stripe's entire surface.
export type StripeClient = Pick<Stripe, 'paymentIntents' | 'refunds'>;

// Real PSP adapter (ORIVEX Roadmap 2.0 implementation program, Stage 1).
// Bound in payment.module.ts only when STRIPE_SECRET_KEY is set --
// InitiateChargeUseCase's flow is synchronous (a single authorize() call
// resolves succeeded/failed immediately), so this uses PaymentIntents with
// `confirm: true` rather than the separate-capture flow; genuinely
// asynchronous payment methods still resolve via the webhook receiver
// (payment.controller.ts's POST /payments/webhook) updating the
// transaction afterwards.
//
// Takes an already-constructed Stripe client rather than a raw secret key
// -- keeps this adapter's own dependency injectable/testable (Ports &
// Adapters: the adapter's own external dependency should be substitutable),
// with payment.module.ts owning the one real `new Stripe(secretKey)` call.
@Injectable()
export class StripePaymentGatewayAdapter implements PaymentGatewayPort {
  constructor(private readonly client: StripeClient) {}

  async authorize(request: AuthorizePaymentRequest): Promise<AuthorizePaymentResult> {
    try {
      const paymentIntent = await this.client.paymentIntents.create({
        amount: toMinorUnits(request.amount, request.currency),
        currency: request.currency.toLowerCase(),
        payment_method_types: [toStripePaymentMethodType(request.paymentMethod)],
        payment_method: request.paymentMethodToken,
        confirm: true,
        // This backend never has a return_url to redirect back to after an
        // off-session confirmation -- reject any payment method that would
        // require one rather than silently hang.
        error_on_requires_action: true,
      });

      return {
        succeeded: paymentIntent.status === 'succeeded',
        externalReference: paymentIntent.id,
      };
    } catch (error) {
      if (error instanceof Stripe.errors.StripeCardError) {
        return { succeeded: false };
      }
      throw error;
    }
  }

  async refund(request: RefundPaymentRequest): Promise<RefundPaymentResult> {
    const refund = await this.client.refunds.create({ payment_intent: request.externalReference });
    return { succeeded: refund.status === 'succeeded' || refund.status === 'pending' };
  }
}

// Stripe amounts are always the smallest currency unit (cents for USD,
// piastres for EGP) -- both currencies this codebase uses today are
// 2-decimal, but this is written generically rather than hardcoding *100.
export function toMinorUnits(amount: number, currency: string): number {
  const zeroDecimalCurrencies = new Set(['JPY', 'KRW', 'VND']);
  const multiplier = zeroDecimalCurrencies.has(currency.toUpperCase()) ? 1 : 100;
  return Math.round(amount * multiplier);
}

export function toStripePaymentMethodType(method: PaymentMethod): string {
  switch (method) {
    case PaymentMethod.Card:
      return 'card';
    case PaymentMethod.MobileWallet:
      return 'card'; // Stripe has no generic "mobile wallet" payment_method_type; Apple/Google Pay ride the "card" type via automatic_payment_methods.
    default:
      return 'card';
  }
}
