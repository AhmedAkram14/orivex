export const PAYMENT_PATHS = {
  initiateCharge: '/payments',
  getById: (id: string) => `/payments/${id}`,
  getByConsultationSessionId: (consultationSessionId: string) =>
    `/payments/by-consultation-session/${consultationSessionId}`,
  refund: (id: string) => `/payments/${id}/refund`,
} as const;
