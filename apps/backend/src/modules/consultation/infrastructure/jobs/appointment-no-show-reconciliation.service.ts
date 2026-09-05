import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { MarkMissedAppointmentsNoShowUseCase } from '../../application/use-cases/mark-missed-appointments-no-show/mark-missed-appointments-no-show.use-case.js';

// Join-Window Enforcement feature: same "no cron/scheduler package exists
// yet" precedent as StaleConsultationSessionReconciliationService -- a
// plain `setInterval` inside a NestJS lifecycle hook, zero new
// dependencies. Runs every SWEEP_INTERVAL_MS, marking any Confirmed
// appointment No-show once JOIN_WINDOW_MISSED_AFTER_MS (1 hour) has passed
// since its scheduledAt with the consultation never actually started.
const SWEEP_INTERVAL_MS = 5 * 60_000; // every 5 minutes
const JOIN_WINDOW_MISSED_AFTER_MS = 60 * 60_000; // 1 hour past scheduledAt

@Injectable()
export class AppointmentNoShowReconciliationService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly markMissedAppointmentsNoShowUseCase: MarkMissedAppointmentsNoShowUseCase,
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
      const result = await this.markMissedAppointmentsNoShowUseCase.execute(JOIN_WINDOW_MISSED_AFTER_MS);
      if (result.markedNoShow > 0 || result.failed > 0) {
        this.logger.log('Appointment no-show reconciliation swept', {
          markedNoShow: result.markedNoShow,
          failed: result.failed,
        });
      }
    } catch (error) {
      this.logger.error('Appointment no-show reconciliation sweep failed', { error });
    }
  }
}
