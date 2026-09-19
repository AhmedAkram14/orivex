import type { DoctorEarningsFilterParams } from '@/features/payment/api/types';

// I2 -- Doctor earnings dashboard (docs/01-prd.md L15, L94 §2.10). Shared by
// earnings-summary/earnings-transactions/earnings-export -- all three take
// the exact same `dateFrom`/`dateTo` query contract
// (`DoctorEarningsFilterQueryDto`), so a single query-string builder keeps
// them from silently drifting apart.
function earningsQueryString(params: DoctorEarningsFilterParams = {}): string {
  const query = new URLSearchParams();
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export const PAYMENT_PATHS = {
  initiateCharge: '/payments',
  getById: (id: string) => `/payments/${id}`,
  getByConsultationSessionId: (consultationSessionId: string) =>
    `/payments/by-consultation-session/${consultationSessionId}`,
  refund: (id: string) => `/payments/${id}/refund`,
  doctorEarningsSummary: (params?: DoctorEarningsFilterParams) => `/payments/doctor/earnings-summary${earningsQueryString(params)}`,
  doctorEarningsTransactions: (params?: DoctorEarningsFilterParams) =>
    `/payments/doctor/earnings-transactions${earningsQueryString(params)}`,
  doctorEarningsExport: (params?: DoctorEarningsFilterParams) => `/payments/doctor/earnings-export${earningsQueryString(params)}`,
} as const;
