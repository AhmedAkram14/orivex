import { apiFetch } from '@/shared/lib/api/client';
import { CONSULTATION_PATHS } from '@/features/consultation/api/paths';
import type { ConsultationSession } from '@/features/consultation/api/types';

/**
 * The only module that talks to `/consultations/:id/start` (and future
 * lifecycle actions on the same ConsultationModule) — mirrors
 * `telemedicineApi`'s shape: a thin typed wrapper over `apiFetch`.
 */
export const consultationApi = {
  start: (consultationSessionId: string) =>
    apiFetch<ConsultationSession>({ method: 'POST', path: CONSULTATION_PATHS.start(consultationSessionId) }),
};
