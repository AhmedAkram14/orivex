export const CONSULTATION_PATHS = {
  start: (consultationSessionId: string) => `/consultations/${consultationSessionId}/start`,
  close: (consultationSessionId: string) => `/consultations/${consultationSessionId}/close`,
  summary: (consultationSessionId: string) => `/consultations/${consultationSessionId}/summary`,
  feedback: (consultationSessionId: string) => `/consultations/${consultationSessionId}/feedback`,
  followUp: (consultationSessionId: string) => `/consultations/${consultationSessionId}/follow-up`,
  diagnosis: (consultationSessionId: string) => `/consultations/${consultationSessionId}/diagnosis`,
  notes: (consultationSessionId: string) => `/consultations/${consultationSessionId}/notes`,
  vitals: (consultationSessionId: string) => `/consultations/${consultationSessionId}/vitals`,
  doctorReviews: (doctorProfileId: string) => `/doctors/${doctorProfileId}/reviews`,
} as const;
