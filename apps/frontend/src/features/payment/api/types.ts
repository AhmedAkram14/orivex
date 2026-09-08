export type PaymentMethod = 'card' | 'mobile_wallet';

export type PaymentStatus = 'initiated' | 'succeeded' | 'failed' | 'settled' | 'refunded' | 'disputed';

export interface Money {
  amount: number;
  currency: string;
}

/** Matches apps/backend/.../payment-transaction-response.dto.ts exactly. */
export interface PaymentTransaction {
  id: string;
  appointmentId: string;
  consultationSessionId: string | null;
  amount: Money;
  status: PaymentStatus;
  createdAt: string;
}

/**
 * Consultation Pricing Lifecycle Completion (pay-then-confirm): keyed by
 * appointmentId, not consultationSessionId -- no ConsultationSession exists
 * yet at charge time (one is only opened once this charge succeeds).
 */
export interface InitiateChargeRequest {
  idempotencyKey: string;
  appointmentId: string;
  amount: Money;
  paymentMethod: PaymentMethod;
  /** A Stripe payment-method id from Stripe Elements -- never a raw card number. */
  paymentMethodToken: string;
}

/** Matches DoctorEarningsCycleDto exactly (I2 -- Doctor earnings, docs/01-prd.md L15, L94 §2.10). */
export interface DoctorEarningsCycle {
  cycleLabel: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  transactionCount: number;
}

/**
 * Matches DoctorEarningsSummaryResponseDto exactly. Derived on demand from
 * the existing PaymentTransaction ledger -- no separate payout/invoice
 * model exists, so "lifetime net" is exactly that (every Succeeded/Settled
 * transaction's commission-adjusted amount), not "what's been wired to a
 * bank account" (no PSP payout integration exists to report that from).
 */
export interface DoctorEarningsSummary {
  currency: string | null;
  commissionRate: number;
  lifetimeGrossAmount: number;
  lifetimeCommissionAmount: number;
  lifetimeNetAmount: number;
  lifetimeTransactionCount: number;
  cycles: DoctorEarningsCycle[];
}
