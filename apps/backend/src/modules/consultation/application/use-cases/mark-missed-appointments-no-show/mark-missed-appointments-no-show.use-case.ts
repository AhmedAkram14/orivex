import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// consultation.module.ts only.
//
// Join-Window Enforcement feature: the system-side half of the "missed
// appointment" rule -- a Confirmed appointment whose join window (15
// minutes before through 1 hour after scheduledAt, matching
// MintConsultationRoomTokenUseCase's own patient-side guard and the
// frontend's canJoinCall) closed with the consultation never actually
// started (its ConsultationSession is still WaitingRoom). Mirrors
// ReconcileStaleConsultationSessionsUseCase's exact shape: each appointment
// is transitioned independently, one failure (e.g. a concurrent cancel/
// reschedule racing this sweep) must never abort the rest of the batch.
// Deliberately does not touch the ConsultationSession itself -- the
// existing stale-session sweep (a separate, longer 4-hour timeout) already
// owns reconciling an abandoned WaitingRoom session to a terminal state.
export class MarkMissedAppointmentsNoShowUseCase {
  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  async execute(joinWindowMissedAfterMs: number, now: Date = new Date()): Promise<{ markedNoShow: number; failed: number }> {
    const cutoff = new Date(now.getTime() - joinWindowMissedAfterMs);
    const missedAppointments = await this.appointmentRepository.findConfirmedPastJoinWindowMissed(cutoff);

    let markedNoShow = 0;
    let failed = 0;
    for (const appointment of missedAppointments) {
      try {
        appointment.markNoShow();
        await this.appointmentRepository.save(appointment);
        markedNoShow += 1;
      } catch {
        failed += 1;
      }
    }

    return { markedNoShow, failed };
  }
}
