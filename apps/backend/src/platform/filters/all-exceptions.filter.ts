import { randomUUID } from 'node:crypto';

import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { correlationContext } from '../../shared/correlation/correlation-context.js';
import { AppError } from '../../shared/errors/app-error.js';
import { PinoLoggerService } from '../logging/pino-logger.service.js';
import { captureUnexpectedError } from '../observability/error-reporting.js';
import { VALIDATION_FAILED_CODE } from '../validation/constants/validation-codes.js';
import { VALIDATION_FAILED_MESSAGE } from '../validation/constants/validation-messages.js';
import { ValidationFailedException } from '../validation/validation-exception.js';

interface ErrorPayload {
  code: string;
  message: string;
  details?: { field?: string; code: string; message: string }[];
}

// Response shape matches the ErrorResponse schema in docs/12-openapi.md
// exactly: { error: { code, message, details?, requestId, timestamp } }.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, payload } = this.resolve(exception);
    const requestId = correlationContext.getRequestId() ?? randomUUID();

    this.logger.error(
      'unhandled exception',
      exception instanceof Error ? exception.stack : String(exception),
      { requestId, path: request.originalUrl },
    );

    // Only genuinely unexpected (5xx) failures are reported to Sentry --
    // every documented 4xx (validation, domain rules, not-found, forbidden)
    // is expected API behavior, not an incident.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      captureUnexpectedError(exception, { requestId, path: request.originalUrl });
    }

    response.status(status).json({
      error: {
        ...payload,
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private resolve(exception: unknown): { status: number; payload: ErrorPayload } {
    if (exception instanceof ValidationFailedException) {
      return {
        status: HttpStatus.BAD_REQUEST,
        payload: {
          code: VALIDATION_FAILED_CODE,
          message: VALIDATION_FAILED_MESSAGE,
          details: exception.details,
        },
      };
    }

    if (exception instanceof AppError) {
      return {
        status: exception.httpStatus,
        payload: { code: exception.code, message: exception.message },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'object' && body !== null && 'message' in body) {
        const messageField = (body as { message: unknown }).message;
        const details = Array.isArray(messageField)
          ? messageField.map((m) => ({ code: 'VALIDATION_FAILED', message: String(m) }))
          : undefined;

        return {
          status,
          payload: {
            code: status === HttpStatus.BAD_REQUEST ? 'VALIDATION_FAILED' : 'HTTP_ERROR',
            message: typeof messageField === 'string' ? messageField : exception.message,
            details,
          },
        };
      }

      return { status, payload: { code: 'HTTP_ERROR', message: exception.message } };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      payload: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    };
  }
}
