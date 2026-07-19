import type { PaymentMethod } from '../../domain/enums/payment-method.enum.js';

export interface AuthorizePaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  // A gateway-specific payment-method reference (e.g. a Stripe payment
  // method id) collected client-side -- this port never accepts a raw card
  // number.
  paymentMethodToken: string;
}

export interface AuthorizePaymentResult {
  succeeded: boolean;
  // The gateway's own reference for this charge (e.g. a Stripe PaymentIntent
  // id) -- stored on PaymentTransaction so an inbound webhook event can be
  // matched back to the transaction that created it. Undefined for gateways
  // that never confirm asynchronously (or the not-configured stub).
  externalReference?: string;
}

export interface RefundPaymentRequest {
  // The same reference authorize() returned -- refunding is only ever
  // gateway-side, never re-derived from amount/currency, so it can't
  // accidentally refund the wrong charge.
  externalReference: string;
}

export interface RefundPaymentResult {
  succeeded: boolean;
}

// Port only (docs/06-system-architecture.md Section 11: "every external
// dependency is accessed through a dedicated adapter... implementing a
// stable internal interface"). Matches docs/10-backend-architecture.md's
// PaymentModule dependency: "external PSP adapter (Section 7/11)".
//
// Stripe is the bound adapter as of the ORIVEX Roadmap 2.0 implementation
// program's Stage 1 (docs/14-adrs.md) -- PaymentModule falls back to
// NotConfiguredPaymentGatewayAdapter whenever STRIPE_SECRET_KEY is unset,
// so the app keeps booting cleanly with zero PSP credentials configured,
// exactly as it always has.
export interface PaymentGatewayPort {
  authorize(request: AuthorizePaymentRequest): Promise<AuthorizePaymentResult>;
  refund(request: RefundPaymentRequest): Promise<RefundPaymentResult>;
}
