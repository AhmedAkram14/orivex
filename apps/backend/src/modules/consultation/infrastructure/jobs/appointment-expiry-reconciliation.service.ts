import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { ExpireStaleAppointmentsUseCase } from '../../application/use-cases/expire-stale-appointments/expire-stale-appointments.use-case.js';

// Phase 0 (stale-request terminal state): same "no cron/scheduler package
// exists yet" precedent as StaleConsultationSessionReconciliationService/
// AppointmentNoShowReconciliationService -- a plain `setInterval` inside a
// NestJS lifecycle hook, zero new dependencies. Runs every SWEEP_INTERVAL_MS,
// expiring any `Requested` appointment whose scheduledAt has already passed
// with nobody ever approving, declining, or paying for it.
const SWEEP_INTERVAL_MS = 15 * 60_000; // every 15 minutes

@Injectable()
export class AppointmentExpiryReconciliationService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly expireStaleAppointmentsUseCase: ExpireStaleAppointmentsUseCase,
    private readonly logger: PinoLoggerService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.runSweep();
    }, SWEEP_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async runSweep(): Promise<void> {
    try {
      const result = await this.expireStaleAppointmentsUseCase.execute();
      if (result.expired > 0 || result.failed > 0) {
        this.logger.log('Stale appointment expiry reconciliation swept', {
          expired: result.expired,
          failed: result.failed,
        });
      }
    } catch (error) {
      this.logger.error('Stale appointment expiry reconciliation sweep failed', { error });
    }
  }
}
