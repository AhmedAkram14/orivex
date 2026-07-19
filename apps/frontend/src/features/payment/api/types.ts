export type PaymentMethod = 'card' | 'mobile_wallet';

export type PaymentStatus = 'initiated' | 'succeeded' | 'failed' | 'settled' | 'refunded' | 'disputed';

export interface Money {
  amount: number;
  currency: string;
}

/** Matches apps/backend/.../payment-transaction-response.dto.ts exactly. */
export interface PaymentTransaction {
  id: string;
  consultationSessionId: string | null;
  amount: Money;
  status: PaymentStatus;
  createdAt: string;
}

export interface InitiateChargeRequest {
  idempotencyKey: string;
  consultationSessionId: string;
  amount: Money;
  paymentMethod: PaymentMethod;
  /** A Stripe payment-method id from Stripe Elements -- never a raw card number. */
  paymentMethodToken: string;
}
