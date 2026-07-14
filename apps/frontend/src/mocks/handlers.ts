import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';

/**
 * Request handlers shared between the browser worker (manual dev/QA
 * mocking, opt-in via NEXT_PUBLIC_ENABLE_API_MOCKS) and the Node server
 * (Vitest component/integration tests that need to mock a fetch call).
 * Empty beyond this one example on purpose — a handler is added the
 * moment a feature module actually needs to mock its endpoint, not
 * speculatively for endpoints nothing calls yet.
 */
export const handlers = [
  http.get(`${env.apiBaseUrl}/health/liveness`, () =>
    HttpResponse.json({ status: 'ok', uptimeSeconds: 0, timestamp: new Date().toISOString() }),
  ),
];
