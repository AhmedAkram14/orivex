import { randomUUID } from 'node:crypto';

import { correlationContext } from '../correlation/correlation-context.js';

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
}

// Optional, additive pagination metadata (Production Readiness Audit --
// "introduce pagination where required"). Only list endpoints that accept
// page/limit populate this; every other response's meta stays exactly
// { requestId, timestamp } as before -- this is a strictly additive field,
// never a breaking change to the envelope shape.
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ResponseEnvelope<T> {
  data: T;
  meta: ResponseMeta & Partial<PaginationMeta>;
}

// Matches the { data, meta } success-response envelope used throughout
// docs/12-openapi.md (ResponseMeta schema + every documented 2xx response).
// Not Identity-specific — every future controller should use this same
// wrapper rather than returning bare bodies.
export function envelope<T>(data: T, pagination?: PaginationMeta): ResponseEnvelope<T> {
  return {
    data,
    meta: {
      requestId: correlationContext.getRequestId() ?? randomUUID(),
      timestamp: new Date().toISOString(),
      ...pagination,
    },
  };
}
