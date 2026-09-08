export const PAYMENT_PATHS = {
  initiateCharge: '/payments',
  getById: (id: string) => `/payments/${id}`,
  getByConsultationSessionId: (consultationSessionId: string) =>
    `/payments/by-consultation-session/${consultationSessionId}`,
  refund: (id: string) => `/payments/${id}/refund`,
  // I2 -- Doctor earnings dashboard (docs/01-prd.md L15, L94 §2.10).
  doctorEarningsSummary: '/payments/doctor/earnings-summary',
} as const;
