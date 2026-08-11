import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { ReconcileStaleConsultationSessionsUseCase } from '../../application/use-cases/reconcile-stale-consultation-sessions/reconcile-stale-consultation-sessions.use-case.js';

// Consultation Lifecycle Completion: no cron/scheduler package exists in
// this codebase yet (docs/14-adrs.md has no ADR selecting one), and adding
// one is a framework decision outside this pass's scope -- a plain
// `setInterval` inside a NestJS lifecycle hook is the smallest correct tool
// for "periodically run one use case," with zero new dependencies. Runs
// every SWEEP_INTERVAL_MS, closing any ConsultationSession left
// WaitingRoom/InProgress for longer than STALE_AFTER_MS with no activity --
// the safety net for a doctor who never clicks "End" and whose LiveKit
// room_finished webhook (telemedicine-webhook.controller.ts) never arrives
// either.
const SWEEP_INTERVAL_MS = 15 * 60_000; // every 15 minutes
const STALE_AFTER_MS = 4 * 60 * 60_000; // 4 hours of no activity

@Injectable()
export class StaleConsultationSessionReconciliationService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly reconcileStaleConsultationSessionsUseCase: ReconcileStaleConsultationSessionsUseCase,
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
      const result = await this.reconcileStaleConsultationSessionsUseCase.execute(STALE_AFTER_MS);
      if (result.closed > 0 || result.failed > 0) {
        this.logger.log('Stale consultation session reconciliation swept', {
          closed: result.closed,
          failed: result.failed,
        });
      }
    } catch (error) {
      this.logger.error('Stale consultation session reconciliation sweep failed', { error });
    }
  }
}
