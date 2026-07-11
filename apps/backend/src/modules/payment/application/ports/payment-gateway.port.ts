import type { PaymentMethod } from '../../domain/enums/payment-method.enum.js';

export interface AuthorizePaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
}

export interface AuthorizePaymentResult {
  succeeded: boolean;
}

// Port only (docs/06-system-architecture.md Section 11: "every external
// dependency is accessed through a dedicated adapter... implementing a
// stable internal interface"). Matches docs/10-backend-architecture.md's
// PaymentModule dependency: "external PSP adapter (Section 7/11)".
//
// No concrete adapter exists yet -- V1's PSP decision is "buy, always, for
// payments" (docs/01-prd.md) but no specific licensed local PSP has been
// selected. Per architect direction, this port is intentionally left
// unbound rather than fabricated: registering a fake gateway would
// misrepresent a real external integration that doesn't exist yet.
export interface PaymentGatewayPort {
  authorize(request: AuthorizePaymentRequest): Promise<AuthorizePaymentResult>;
}
