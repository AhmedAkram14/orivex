import { randomUUID } from 'node:crypto';

import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { correlationContext } from '../../shared/correlation/correlation-context.js';

// Header name matches the CorrelationId parameter defined in
// docs/12-openapi.md (X-Request-Id): client-supplied, server-generates if absent.
const REQUEST_ID_HEADER = 'x-request-id';
const MAX_REQUEST_ID_LENGTH = 128;
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

function isValidRequestId(value: string): boolean {
  return (
    value.length > 0 && value.length <= MAX_REQUEST_ID_LENGTH && SAFE_REQUEST_ID_PATTERN.test(value)
  );
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header(REQUEST_ID_HEADER);
    const requestId = incoming && isValidRequestId(incoming) ? incoming : randomUUID();
    res.setHeader('X-Request-Id', requestId);
    correlationContext.run({ requestId }, () => next());
  }
}
