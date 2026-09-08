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
  // I1 -- Lab Requests. Not nested under /consultations/:id either -- matches
  // LabRequestController's own @Controller('lab-requests') shape exactly,
  // same convention as prescriptions above.
  labRequests: () => '/lab-requests',
  // Not nested under /consultations/:id either -- matches JourneyController's
  // own @Controller('journeys') shape exactly.
  journeyStage: (journeyId: string) => `/journeys/${journeyId}`,
  // AI Copilot: matches AISuggestionController's own @Controller('ai/suggestions')
  // shape exactly -- consultationSessionId is carried in the request body,
  // not the URL, for the request; the decision route is keyed by the
  // suggestion's own id.
  aiSuggestions: () => '/ai/suggestions',
  aiSuggestionDecision: (suggestionId: string) => `/ai/suggestions/${suggestionId}`,
} as const;
