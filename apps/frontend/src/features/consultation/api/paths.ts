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
  // I11 -- Admin content moderation: matches DoctorReviewFlagController's
  // own @Controller('reviews') shape exactly.
  flagReview: (feedbackId: string) => `/reviews/${feedbackId}/flag`,
  // I11 -- Admin dispute resolution: matches DisputeController's own
  // @Controller('disputes') shape exactly.
  disputes: () => '/disputes',
  dispute: (id: string) => `/disputes/${id}`,
  // I12 -- Prescription digital signature and verification marker: matches
  // PrescriptionVerificationController's own @Controller('prescriptions/verify') shape exactly.
  verifyPrescription: (code: string) => `/prescriptions/verify/${code}`,
} as const;
