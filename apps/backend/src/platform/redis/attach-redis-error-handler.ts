import type { Redis } from 'ioredis';

import type { PinoLoggerService } from '../logging/pino-logger.service.js';

const LOG_THROTTLE_MS = 60_000;

/**
 * Incident 2026-09-22 (login returning 500 while the live backend was still
 * running an OLDER, unrelated commit): NotificationModule's two raw ioredis
 * connections (the BullMQ Queue's and the appointment-reminder Worker's,
 * both constructed with `new Redis(...)`) had no `error` listener attached
 * at all. Node's EventEmitter throws when an `error` event fires with zero
 * listeners -- so once Upstash's monthly request quota was exhausted and
 * every command started coming back as an application-level Redis error,
 * an unhandled `error` emission on either connection could crash the whole
 * process outright, which is a real, one-line-fixable robustness gap
 * regardless of the quota exhaustion's own root cause (Upstash billing/
 * quota, not this codebase).
 *
 * A quota-exceeded condition isn't a dropped connection -- ioredis's own
 * `retryStrategy` (connection-level reconnect backoff) never engages for
 * it, so whatever keeps polling Redis (BullMQ's Worker especially) will
 * keep re-issuing commands at its own cadence, each one erroring again.
 * This handler doesn't change that cadence (out of scope: it isn't a
 * config knob calling code can hand BullMQ), but it does two things that
 * are in scope and matter: (1) stop the process-crash risk from a bare
 * unhandled `error` event, and (2) throttle logging so a sustained outage
 * produces one line per minute per connection instead of flooding stdout
 * (and, on some platforms, log-ingestion cost) at whatever frequency the
 * underlying command retries happen.
 */
export function attachRedisErrorHandler(connection: Redis, logger: PinoLoggerService, label: string): void {
  let lastLoggedAt = 0;
  connection.on('error', (error: Error) => {
    const now = Date.now();
    if (now - lastLoggedAt < LOG_THROTTLE_MS) {
      return;
    }
    lastLoggedAt = now;
    logger.error(`Redis connection error (${label}) -- further occurrences suppressed for ${LOG_THROTTLE_MS / 1000}s`, error.stack, {
      label,
    });
  });
}
