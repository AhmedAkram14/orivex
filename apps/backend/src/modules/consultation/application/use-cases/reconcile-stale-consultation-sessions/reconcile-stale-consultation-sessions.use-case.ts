import { ConsultationCompletionReason } from '../../../domain/enums/consultation-completion-reason.enum.js';
import { ConsultationState } from '../../../domain/enums/consultation-state.enum.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';
import { CloseConsultationCommand } from '../close-consultation/close-consultation.command.js';
import type { CloseConsultationUseCase } from '../close-consultation/close-consultation.use-case.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// consultation.module.ts only.
//
// Consultation Lifecycle Completion (product decision: "add both a LiveKit
// room_finished handler and a timeout job"). The safety net for the case
// LiveKit's webhook doesn't cover: a doctor's browser crashes, they forget
// to click "End", or the LiveKit webhook itself never arrives (missed
// delivery, LiveKit not configured in this environment, etc.) -- a session
// left WaitingRoom/InProgress with no activity for a long time is
// reconciled to a real terminal state instead of staying open forever.
// Reuses CloseConsultationUseCase's exact transition logic (InProgress ->
// Completed marks the Appointment Completed too; WaitingRoom -> Interrupted
// leaves it Confirmed, matching a call that never actually started) rather
// than duplicating it. Each session is closed independently -- one
// failure must not abort the rest of the sweep.
export class ReconcileStaleConsultationSessionsUseCase {
  constructor(
    private readonly consultationSessionRepository: ConsultationSessionRepository,
    private readonly closeConsultationUseCase: CloseConsultationUseCase,
  ) {}

  async execute(staleAfterMs: number, now: Date = new Date()): Promise<{ closed: number; failed: number }> {
    const cutoff = new Date(now.getTime() - staleAfterMs);
    const staleSessions = await this.consultationSessionRepository.findStale(cutoff);

    let closed = 0;
    let failed = 0;
    for (const session of staleSessions) {
      const completionReason =
        session.getState() === ConsultationState.InProgress
          ? ConsultationCompletionReason.Completed
          : ConsultationCompletionReason.InterruptedTechnical;
      try {
        await this.closeConsultationUseCase.execute(
          new CloseConsultationCommand({ consultationSessionId: session.getId(), completionReason }),
        );
        closed += 1;
      } catch {
        // Most likely a concurrent close (the doctor closed it, or the
        // LiveKit webhook beat this sweep to it) racing with this sweep --
        // not a reason to abort the rest of the batch.
        failed += 1;
      }
    }

    return { closed, failed };
  }
}
