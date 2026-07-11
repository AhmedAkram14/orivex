import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { PinoLoggerService } from '../logging/pino-logger.service.js';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        const details = {
          method: request.method,
          path: request.originalUrl,
          statusCode: response.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
        };

        // Health checks are polled frequently by load balancers/orchestrators;
        // logging them at info level would drown out real request activity.
        if (request.originalUrl.startsWith('/health')) {
          this.logger.debug('request completed', details);
        } else {
          this.logger.log('request completed', details);
        }
      }),
    );
  }
}
