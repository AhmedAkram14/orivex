import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { ReleaseSlotCommand } from '../../../../scheduling/application/use-cases/release-slot/release-slot.command.js';
import type { ReleaseSlotUseCase } from '../../../../scheduling/application/use-cases/release-slot/release-slot.use-case.js';
import type { Appointment } from '../../../domain/entities/appointment.entity.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';

import type { DeclineAppointmentCommand } from './decline-appointment.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// consultation.module.ts only.
//
// Doctor Patient Chart Phase 2: mirrors ConfirmAppointmentUseCase's shape.
// A declined appointment was necessarily Requested (Appointment.decline()
// only allows that transition), so its slot was only ever Held, never
// Booked -- the slot is always released back to Open, unlike
// RescheduleOrCancelAppointmentUseCase's cancel() path, which conditionally
// releases only when `wasRequested` (cancel() also allows Confirmed/NoShow,
// where the window is Booked, not Held).
export class DeclineAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly releaseSlotUseCase: ReleaseSlotUseCase,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: DeclineAppointmentCommand): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(command.appointmentId);
    if (!appointment) {
      throw new NotFoundError(`Appointment "${command.appointmentId}" not found.`);
    }

    appointment.decline(command.reason);
    await this.releaseSlotUseCase.execute(
      new ReleaseSlotCommand({ availabilityWindowId: appointment.getAvailabilityWindowId() }),
    );

    await this.appointmentRepository.save(appointment);
    await this.eventDispatcher.dispatch(appointment.releaseDomainEvents());

    return appointment;
  }
}
