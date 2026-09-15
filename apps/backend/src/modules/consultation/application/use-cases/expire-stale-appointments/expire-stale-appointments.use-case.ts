import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { ReleaseSlotCommand } from '../../../../scheduling/application/use-cases/release-slot/release-slot.command.js';
import type { ReleaseSlotUseCase } from '../../../../scheduling/application/use-cases/release-slot/release-slot.use-case.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// consultation.module.ts only.
//
// Phase 0 (stale-request terminal state): the system-side sweep that gives
// a stale `Requested` appointment a real terminal outcome instead of it
// just silently disappearing from every "upcoming work" view once its
// scheduledAt passes. Mirrors MarkMissedAppointmentsNoShowUseCase's exact
// shape (each appointment transitioned independently, one failure must
// never abort the rest of the batch) and DeclineAppointmentUseCase's slot-
// release + event-dispatch sequence -- an Expired appointment was
// necessarily Requested (Appointment.expire() only allows that transition),
// so its slot was only ever Held, never Booked, same reasoning as
// DeclineAppointmentUseCase's own comment.
export class ExpireStaleAppointmentsUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly releaseSlotUseCase: ReleaseSlotUseCase,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(now: Date = new Date()): Promise<{ expired: number; failed: number }> {
    const staleAppointments = await this.appointmentRepository.findRequestedPastScheduledAt(now);

    let expired = 0;
    let failed = 0;
    for (const appointment of staleAppointments) {
      try {
        appointment.expire();
        await this.releaseSlotUseCase.execute(
          new ReleaseSlotCommand({ availabilityWindowId: appointment.getAvailabilityWindowId() }),
        );
        await this.appointmentRepository.save(appointment);
        await this.eventDispatcher.dispatch(appointment.releaseDomainEvents());
        expired += 1;
      } catch {
        failed += 1;
      }
    }

    return { expired, failed };
  }
}
