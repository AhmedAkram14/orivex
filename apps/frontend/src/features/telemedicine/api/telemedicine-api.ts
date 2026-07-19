import { apiFetch } from '@/shared/lib/api/client';
import { TELEMEDICINE_PATHS } from '@/features/telemedicine/api/paths';
import type { RoomToken } from '@/features/telemedicine/api/types';

/**
 * The only module that talks to `/consultations/:id/room-token` — mirrors
 * `paymentApi`'s shape: a thin typed wrapper over `apiFetch`, no logic of
 * its own. Real backend endpoint (ConsultationModule's ConsultationController,
 * ORIVEX Roadmap 2.0 Stage 2).
 */
export const telemedicineApi = {
  mintRoomToken: (consultationSessionId: string, displayName?: string) =>
    apiFetch<RoomToken>({
      method: 'POST',
      path: TELEMEDICINE_PATHS.roomToken(consultationSessionId),
      body: { displayName },
    }),
};
