import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { ConfirmSlotCommand } from '../../../../scheduling/application/use-cases/confirm-slot/confirm-slot.command.js';
import type { ConfirmSlotUseCase } from '../../../../scheduling/application/use-cases/confirm-slot/confirm-slot.use-case.js';
import type { Appointment } from '../../../domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';

import type { ConfirmAppointmentCommand } from './confirm-appointment.command.js';

export interface ConfirmAppointmentResult {
  appointment: Appointment;
  session: ConsultationSession;
}

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// consultation.module.ts only.
//
// Shared confirmation step: BookAppointmentUseCase calls this directly for
// free bookings (no payment step); PaymentModule (Sprint 9) will call this
// same exported use case once a paid booking's charge succeeds. Confirms
// the Appointment, confirms the held slot via SchedulingModule's exported
// ConfirmSlotUseCase, and opens the ConsultationSession.
export class ConfirmAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly consultationSessionRepository: ConsultationSessionRepository,
    private readonly confirmSlotUseCase: ConfirmSlotUseCase,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: ConfirmAppointmentCommand): Promise<ConfirmAppointmentResult> {
    const appointment = await this.appointmentRepository.findById(command.appointmentId);
    if (!appointment) {
      throw new NotFoundError(`Appointment "${command.appointmentId}" not found.`);
    }

    appointment.confirm();
    await this.confirmSlotUseCase.execute(
      new ConfirmSlotCommand({ availabilityWindowId: appointment.getAvailabilityWindowId() }),
    );

    const session = ConsultationSession.open(appointment.getId());

    await this.appointmentRepository.save(appointment);
    await this.consultationSessionRepository.save(session);
    await this.eventDispatcher.dispatch([...appointment.releaseDomainEvents(), ...session.releaseDomainEvents()]);

    return { appointment, session };
  }
}
