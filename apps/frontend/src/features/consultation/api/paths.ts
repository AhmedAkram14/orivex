export const CONSULTATION_PATHS = {
  start: (consultationSessionId: string) => `/consultations/${consultationSessionId}/start`,
} as const;
