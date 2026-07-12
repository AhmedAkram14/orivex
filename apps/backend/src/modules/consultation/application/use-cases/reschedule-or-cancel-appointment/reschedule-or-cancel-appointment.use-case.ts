import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { GetAvailabilityWindowByIdUseCase } from '../../../../doctor/application/use-cases/get-availability-window-by-id/get-availability-window-by-id.use-case.js';
import { ReleaseSlotCommand } from '../../../../scheduling/application/use-cases/release-slot/release-slot.command.js';
import type { ReleaseSlotUseCase } from '../../../../scheduling/application/use-cases/release-slot/release-slot.use-case.js';
import { ReserveSlotCommand } from '../../../../scheduling/application/use-cases/reserve-slot/reserve-slot.command.js';
import type { ReserveSlotUseCase } from '../../../../scheduling/application/use-cases/reserve-slot/reserve-slot.use-case.js';
import { Appointment } from '../../../domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../../domain/enums/appointment-status.enum.js';
import { ConsultationType } from '../../../domain/enums/consultation-type.enum.js';
import { ConsultationDomainError } from '../../../domain/exceptions/consultation-domain.error.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import { ConfirmAppointmentCommand } from '../confirm-appointment/confirm-appointment.command.js';
import type { ConfirmAppointmentUseCase } from '../confirm-appointment/confirm-appointment.use-case.js';

import type { RescheduleOrCancelAppointmentCommand } from './reschedule-or-cancel-appointment.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// consultation.module.ts only.
//
// Cancel: mutates the same Appointment to Cancelled. If the slot was still
// only Held (appointment was Requested), it is released back to Open via
// SchedulingModule. If the appointment was already Confirmed, its window
// stays Booked -- AvailabilityWindow has no Booked -> Open transition
// (deliberately not added this sprint to avoid modifying DoctorModule
// without an explicit requirement); this is a known, documented limitation.
//
// Reschedule: marks the current Appointment Rescheduled (terminal) and
// creates a brand-new Appointment on the new slot, referencing the old one
// via rescheduledFromId -- matches docs/07-domain-data-model.md's
// forward-only rule ("every apparent reversal creates a new forward-only
// entry, never a literal rollback").
export class RescheduleOrCancelAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
    private readonly getAvailabilityWindowByIdUseCase: GetAvailabilityWindowByIdUseCase,
    private readonly reserveSlotUseCase: ReserveSlotUseCase,
    private readonly releaseSlotUseCase: ReleaseSlotUseCase,
    private readonly confirmAppointmentUseCase: ConfirmAppointmentUseCase,
  ) {}

  async execute(command: RescheduleOrCancelAppointmentCommand): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(command.appointmentId);
    if (!appointment) {
      throw new NotFoundError(`Appointment "${command.appointmentId}" not found.`);
    }

    if (command.action === 'cancel') {
      return this.cancel(appointment);
    }
    return this.reschedule(appointment, command.newAvailabilityWindowId);
  }

  private async cancel(appointment: Appointment): Promise<Appointment> {
    const wasRequested = appointment.getStatus() === AppointmentStatus.Requested;

    appointment.cancel();
    if (wasRequested) {
      await this.releaseSlotUseCase.execute(
        new ReleaseSlotCommand({ availabilityWindowId: appointment.getAvailabilityWindowId() }),
      );
    }

    await this.appointmentRepository.save(appointment);
    await this.eventDispatcher.dispatch(appointment.releaseDomainEvents());
    return appointment;
  }

  private async reschedule(appointment: Appointment, newAvailabilityWindowId: string | undefined): Promise<Appointment> {
    if (!newAvailabilityWindowId) {
      throw new ConsultationDomainError('newAvailabilityWindowId is required to reschedule.');
    }

    const newWindow = await this.getAvailabilityWindowByIdUseCase.execute({
      availabilityWindowId: newAvailabilityWindowId,
    });
    if (!newWindow) {
      throw new NotFoundError(`AvailabilityWindow "${newAvailabilityWindowId}" not found.`);
    }

    // Pure, in-memory precondition check performed before any external
    // effect (reserving the new slot) -- if the appointment can't actually
    // be rescheduled from its current status, nothing has happened yet and
    // there is no reservation to compensate for.
    const wasRequested = appointment.getStatus() === AppointmentStatus.Requested;
    appointment.markRescheduled();

    await this.reserveSlotUseCase.execute(new ReserveSlotCommand({ availabilityWindowId: newAvailabilityWindowId }));

    let newAppointment = Appointment.request({
      patientId: appointment.getPatientId(),
      doctorId: appointment.getDoctorId(),
      availabilityWindowId: newAvailabilityWindowId,
      consultationType: appointment.getConsultationType(),
      scheduledAt: newWindow.getStartTime(),
      reasonForVisit: appointment.getReasonForVisit(),
      rescheduledFromId: appointment.getId(),
    });

    try {
      await this.appointmentRepository.save(appointment);
      await this.appointmentRepository.save(newAppointment);
    } catch (error) {
      // Compensating action: the new slot was already reserved (Held)
      // above; if persisting either appointment fails, release it back
      // rather than leaving it Held with no Appointment referencing it.
      await this.releaseSlotUseCase.execute(new ReleaseSlotCommand({ availabilityWindowId: newAvailabilityWindowId }));
      throw error;
    }

    if (wasRequested) {
      await this.releaseSlotUseCase.execute(
        new ReleaseSlotCommand({ availabilityWindowId: appointment.getAvailabilityWindowId() }),
      );
    }

    await this.eventDispatcher.dispatch([...appointment.releaseDomainEvents(), ...newAppointment.releaseDomainEvents()]);

    if (newAppointment.getConsultationType() === ConsultationType.Free) {
      const result = await this.confirmAppointmentUseCase.execute(
        new ConfirmAppointmentCommand({ appointmentId: newAppointment.getId() }),
      );
      newAppointment = result.appointment;
    }

    return newAppointment;
  }
}
