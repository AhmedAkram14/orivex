import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';

const base = () => env.apiBaseUrl;

/**
 * Real backend endpoint (ConsultationModule's ConsultationController,
 * ORIVEX Roadmap 2.0 Stage 2) -- this handler exists purely to keep the
 * frontend test suite deterministic, matching `payment.ts`'s precedent. No
 * dedicated store: a minted token has no meaningful state to persist
 * between requests, unlike a payment transaction or notification.
 */
export const telemedicineHandlers = [
  http.post(`${base()}/consultations/:id/room-token`, () =>
    HttpResponse.json({ data: { token: 'mock-livekit-token', url: 'wss://mock.livekit.cloud' } }),
  ),
];
