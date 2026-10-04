import type { InitiateChargeRequest, PaymentTransaction } from '@/features/payment/api/types';

/**
 * In-memory mock "backend" state for `/payments/*` -- mirrors
 * `patient-store.ts`'s pattern. Real backend endpoints (PaymentModule's
 * PaymentController, ORIVEX Roadmap 2.0 Stage 1); this store exists purely
 * to keep the frontend test suite deterministic without a mocking library
 * on the API-client layer (`mocks/handlers/payment.ts` intercepts these the
 * same way every other feature's handlers do).
 */
let transactions: PaymentTransaction[] = [];
let counter = 0;
// ORIVEX Roadmap Phase 3, Critical Lifecycle Gaps, Step 4: the real backend
// resolves patientName/doctorName via Patient/Doctor/IdentityModule reads
// this mock store has no equivalent for -- tests seed a name pair alongside
// a transaction via seedAdminPaymentMeta; anything unseeded falls back to
// the same "Unknown patient"/"Unknown doctor" default the real backend uses
// when a profile lookup comes back empty.
let adminMeta: Record<string, { patientName: string; doctorName: string }> = {};

export function seedTransaction(transaction: PaymentTransaction): PaymentTransaction {
  transactions = [...transactions.filter((t) => t.id !== transaction.id), transaction];
  return transaction;
}

export function getById(id: string): PaymentTransaction | null {
  return transactions.find((t) => t.id === id) ?? null;
}

export function getByConsultationSessionId(consultationSessionId: string): PaymentTransaction | null {
  return transactions.find((t) => t.consultationSessionId === consultationSessionId) ?? null;
}

/**
 * Consultation Pricing Lifecycle Completion (pay-then-confirm): keyed by
 * appointmentId, not consultationSessionId -- no session exists yet at
 * charge time. `consultationSessionId` is set separately, mirroring the
 * real backend's `attachConsultationSessionId()` once confirmation opens
 * one (see `handlers/payment.ts`'s call into `confirmAppointmentAfterPayment`).
 */
export function createCharge(request: InitiateChargeRequest): PaymentTransaction {
  counter += 1;
  const transaction: PaymentTransaction = {
    id: `payment-mock-${counter}`,
    appointmentId: request.appointmentId,
    consultationSessionId: null,
    amount: request.amount,
    status: 'succeeded',
    createdAt: new Date().toISOString(),
  };
  transactions = [...transactions, transaction];
  return transaction;
}

export function attachConsultationSessionId(paymentTransactionId: string, consultationSessionId: string): void {
  transactions = transactions.map((t) => (t.id === paymentTransactionId ? { ...t, consultationSessionId } : t));
}

export type RefundResult =
  | { outcome: 'not-found' }
  | { outcome: 'already-refunded' }
  | { outcome: 'refunded'; transaction: PaymentTransaction };

export function refundTransaction(id: string): RefundResult {
  const existing = getById(id);
  if (!existing) {
    return { outcome: 'not-found' };
  }
  if (existing.status === 'refunded') {
    return { outcome: 'already-refunded' };
  }
  const refunded: PaymentTransaction = { ...existing, status: 'refunded' };
  transactions = transactions.map((t) => (t.id === id ? refunded : t));
  return { outcome: 'refunded', transaction: refunded };
}

export function seedAdminPaymentMeta(id: string, patientName: string, doctorName: string): void {
  adminMeta = { ...adminMeta, [id]: { patientName, doctorName } };
}

export interface AdminPaymentTransactionMock extends PaymentTransaction {
  patientName: string;
  doctorName: string;
}

export function listAllTransactionsForAdmin(page: number, limit: number): { transactions: AdminPaymentTransactionMock[]; total: number } {
  const sorted = [...transactions].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const start = (page - 1) * limit;
  const rows = sorted.slice(start, start + limit).map((transaction) => ({
    ...transaction,
    patientName: adminMeta[transaction.id]?.patientName ?? 'Unknown patient',
    doctorName: adminMeta[transaction.id]?.doctorName ?? 'Unknown doctor',
  }));
  return { transactions: rows, total: sorted.length };
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetPaymentStore(): void {
  transactions = [];
  counter = 0;
  adminMeta = {};
}
