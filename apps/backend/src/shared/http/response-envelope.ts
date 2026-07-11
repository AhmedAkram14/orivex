import { randomUUID } from 'node:crypto';

import { correlationContext } from '../correlation/correlation-context.js';

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
}

export interface ResponseEnvelope<T> {
  data: T;
  meta: ResponseMeta;
}

// Matches the { data, meta } success-response envelope used throughout
// docs/12-openapi.md (ResponseMeta schema + every documented 2xx response).
// Not Identity-specific — every future controller should use this same
// wrapper rather than returning bare bodies.
export function envelope<T>(data: T): ResponseEnvelope<T> {
  return {
    data,
    meta: {
      requestId: correlationContext.getRequestId() ?? randomUUID(),
      timestamp: new Date().toISOString(),
    },
  };
}
