import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { adminHandlers } from '@/mocks/handlers/admin';
import { authHandlers } from '@/mocks/handlers/auth';
import { consultationHandlers } from '@/mocks/handlers/consultation';
import { doctorHandlers } from '@/mocks/handlers/doctor';
import { identityHandlers } from '@/mocks/handlers/identity';
import { mediaAssetHandlers } from '@/mocks/handlers/media-assets';
import { notificationHandlers } from '@/mocks/handlers/notifications';
import { patientHandlers } from '@/mocks/handlers/patient';
import { paymentHandlers } from '@/mocks/handlers/payment';
import { publicHandlers } from '@/mocks/handlers/public';
import { referenceHandlers } from '@/mocks/handlers/reference';
import { schedulingHandlers } from '@/mocks/handlers/scheduling';
import { searchHandlers } from '@/mocks/handlers/search';
import { telemedicineHandlers } from '@/mocks/handlers/telemedicine';

/**
 * Request handlers shared between the browser worker (manual dev/QA
 * mocking, opt-in via NEXT_PUBLIC_ENABLE_API_MOCKS) and the Node server
 * (Vitest component/integration tests that need to mock a fetch call). A
 * handler group is added the moment a feature module actually needs to
 * mock its endpoints, not speculatively for endpoints nothing calls yet —
 * `authHandlers` exists because features/auth genuinely calls `/auth/*`
 * and there is no real backend to call instead.
 */
export const handlers = [
  http.get(`${env.apiBaseUrl}/health/liveness`, () =>
    HttpResponse.json({ status: 'ok', uptimeSeconds: 0, timestamp: new Date().toISOString() }),
  ),
  ...adminHandlers,
  ...authHandlers,
  ...consultationHandlers,
  ...notificationHandlers,
  ...doctorHandlers,
  ...identityHandlers,
  ...mediaAssetHandlers,
  ...patientHandlers,
  ...paymentHandlers,
  ...publicHandlers,
  ...referenceHandlers,
  ...schedulingHandlers,
  ...searchHandlers,
  ...telemedicineHandlers,
];
