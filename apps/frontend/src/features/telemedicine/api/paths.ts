export const TELEMEDICINE_PATHS = {
  roomToken: (consultationSessionId: string) => `/consultations/${consultationSessionId}/room-token`,
} as const;
