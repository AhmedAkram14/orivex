import { apiFetch } from '@/shared/lib/api/client';
import { PAYMENT_PATHS } from '@/features/payment/api/paths';
import { env } from '@/shared/lib/env';
import type {
  DoctorEarningsFilterParams,
  DoctorEarningsSummary,
  DoctorEarningsTransaction,
  InitiateChargeRequest,
  PaymentTransaction,
} from '@/features/payment/api/types';

/**
 * The only module that talks to `/payments/*` — mirrors `notificationsApi`'s
 * shape: thin typed wrappers over `apiFetch`, no logic of their own.
 * Real backend endpoints (PaymentModule's PaymentController, ORIVEX
 * Roadmap 2.0 Stage 1).
 */
export const paymentApi = {
  initiateCharge: (request: InitiateChargeRequest) =>
    apiFetch<PaymentTransaction>({ method: 'POST', path: PAYMENT_PATHS.initiateCharge, body: request }),

  getById: (id: string) => apiFetch<PaymentTransaction>({ path: PAYMENT_PATHS.getById(id) }),

  /** Doctor-only — null when the session has no charge attempt yet (e.g. a Free consultation, or a Paid one still awaiting payment). */
  getByConsultationSessionId: (consultationSessionId: string) =>
    apiFetch<PaymentTransaction | null>({ path: PAYMENT_PATHS.getByConsultationSessionId(consultationSessionId) }),

  refund: (id: string) => apiFetch<PaymentTransaction>({ method: 'POST', path: PAYMENT_PATHS.refund(id) }),

  /**
   * I2 -- Doctor earnings dashboard. `dateFrom`/`dateTo` scope the cycle
   * breakdown only -- the backend always computes `lifetime*` fields across
   * the full, unfiltered ledger regardless of this filter (Doctor Earnings
   * page rebuild, Phase 0 fix).
   */
  getDoctorEarningsSummary: (filter?: DoctorEarningsFilterParams) =>
    apiFetch<DoctorEarningsSummary>({ path: PAYMENT_PATHS.doctorEarningsSummary(filter) }),

  /** Doctor Earnings page rebuild (Phase 1) -- backs the drill-down table. ALL statuses, including `refunded`. */
  getDoctorEarningsTransactions: (filter?: DoctorEarningsFilterParams) =>
    apiFetch<DoctorEarningsTransaction[]>({ path: PAYMENT_PATHS.doctorEarningsTransactions(filter) }),

  // Doctor Earnings page rebuild (Phase 2/3): not routed through `apiFetch`
  // -- the export route returns a raw CSV body, not the `{ data, meta }`
  // envelope `apiFetch` unwraps. Returns the absolute URL for
  // `use-export-doctor-earnings.ts`'s fetch-then-blob-download flow,
  // mirroring `doctorApi.buildReportsExportUrl`'s exact precedent.
  buildEarningsExportUrl: (filter?: DoctorEarningsFilterParams) => `${env.apiBaseUrl}${PAYMENT_PATHS.doctorEarningsExport(filter)}`,
};
