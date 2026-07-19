export const PAYMENT_PATHS = {
  initiateCharge: '/payments',
  getById: (id: string) => `/payments/${id}`,
  refund: (id: string) => `/payments/${id}/refund`,
} as const;
