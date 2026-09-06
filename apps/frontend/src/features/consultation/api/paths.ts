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
  // Not nested under /consultations/:id -- matches the real backend's own
  // route shape exactly (PrescriptionController is @Controller('prescriptions'),
  // with consultationSessionId/diagnosisNodeId carried in the request body).
  prescriptions: () => '/prescriptions',
  // Not nested under /consultations/:id either -- matches JourneyController's
  // own @Controller('journeys') shape exactly.
  journeyStage: (journeyId: string) => `/journeys/${journeyId}`,
} as const;
