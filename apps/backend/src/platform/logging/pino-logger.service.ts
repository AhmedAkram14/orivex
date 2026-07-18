import { Injectable, type LoggerService } from '@nestjs/common';
import pino, { type Logger } from 'pino';

import { correlationContext } from '../../shared/correlation/correlation-context.js';

@Injectable()
export class PinoLoggerService implements LoggerService {
  private readonly logger: Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL ?? 'info',
      timestamp: pino.stdTimeFunctions.isoTime,
      // Every log line carries these so a log aggregator (e.g. the one
      // Sentry/Grafana/whatever collector consumes structured logs from)
      // can filter/group by service and deployed version without parsing
      // the message text -- see docs/15-observability.md.
      base: { service: 'orivex-backend', env: process.env.NODE_ENV ?? 'development' },
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
            }
          : undefined,
    });
  }

  private withContext(): Logger {
    const requestId = correlationContext.getRequestId();
    return requestId ? this.logger.child({ requestId }) : this.logger;
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.withContext().info({ context: optionalParams.at(-1) }, String(message));
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    const { trace, context } = this.splitErrorParams(optionalParams);
    this.withContext().error({ context, trace }, String(message));
  }

  // Nest's LoggerService.error signature is ambiguous: callers may pass
  // (message), (message, trace), or (message, trace, context). With a single
  // extra argument, Nest's own internals use it as context far more often
  // than as a trace, so treat that case as context-only rather than
  // duplicating the same value into both fields.
  private splitErrorParams(optionalParams: unknown[]): { trace?: unknown; context?: unknown } {
    if (optionalParams.length === 0) {
      return {};
    }
    if (optionalParams.length === 1) {
      return { context: optionalParams[0] };
    }
    return { trace: optionalParams[0], context: optionalParams.at(-1) };
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.withContext().warn({ context: optionalParams.at(-1) }, String(message));
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.withContext().debug({ context: optionalParams.at(-1) }, String(message));
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.withContext().trace({ context: optionalParams.at(-1) }, String(message));
  }
}
