import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { GetAvailabilityWindowByIdUseCase } from '../../../../doctor/application/use-cases/get-availability-window-by-id/get-availability-window-by-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { ReleaseSlotCommand } from '../../../../scheduling/application/use-cases/release-slot/release-slot.command.js';
import type { ReleaseSlotUseCase } from '../../../../scheduling/application/use-cases/release-slot/release-slot.use-case.js';
import { ReserveSlotCommand } from '../../../../scheduling/application/use-cases/reserve-slot/reserve-slot.command.js';
import type { ReserveSlotUseCase } from '../../../../scheduling/application/use-cases/reserve-slot/reserve-slot.use-case.js';
import { Appointment } from '../../../domain/entities/appointment.entity.js';
import { ConsultationDomainError } from '../../../domain/exceptions/consultation-domain.error.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';

import type { BookAppointmentCommand } from './book-appointment.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// consultation.module.ts only.
//
// Orchestrates: verify patient/doctor exist (via PatientModule's and
// DoctorModule's own exported use cases -- module-to-module calls only
// through a published interface) -> re-validate the window's doctor and
// consultationType regardless of client-supplied values (docs/12-openapi.md's
// bookAppointment description) -> reserve the slot via SchedulingModule's
// exported ReserveSlotUseCase -> Appointment.request() -> persist.
//
// Every booking (Free or Paid) now lands Requested and stays there until
// the doctor explicitly approves it (ApproveAppointmentUseCase, called from
// DoctorAppointmentsController) -- product decision superseding the
// 2026-07-26 "temporarily auto-confirm Paid bookings too" workaround, which
// this removes entirely rather than layering a new special case on top of
// it. The slot stays Held (not yet Confirmed) until that approval; nothing
// here opens a ConsultationSession anymore either -- ConfirmAppointmentUseCase
// (called from the approval path) still does that, unchanged.
export class BookAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly getAvailabilityWindowByIdUseCase: GetAvailabilityWindowByIdUseCase,
    private readonly reserveSlotUseCase: ReserveSlotUseCase,
    private readonly releaseSlotUseCase: ReleaseSlotUseCase,
  ) {}

  async execute(command: BookAppointmentCommand): Promise<Appointment> {
    const patient = await this.getPatientProfileByIdUseCase.execute({ patientProfileId: command.patientId });
    if (!patient) {
      throw new NotFoundError(`Patient profile "${command.patientId}" not found.`);
    }

    const doctor = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: command.doctorId });
    if (!doctor) {
      throw new NotFoundError(`Doctor profile "${command.doctorId}" not found.`);
    }

    const window = await this.getAvailabilityWindowByIdUseCase.execute({
      availabilityWindowId: command.availabilityWindowId,
    });
    if (!window) {
      throw new NotFoundError(`AvailabilityWindow "${command.availabilityWindowId}" not found.`);
    }
    if (window.getDoctorId() !== command.doctorId) {
      throw new ConsultationDomainError('This availability window does not belong to the requested doctor.');
    }
    if ((window.getConsultationType() as string) !== (command.consultationType as string)) {
      throw new ConsultationDomainError(
        "This availability window's offered consultation type does not match the request.",
      );
    }

    await this.reserveSlotUseCase.execute(new ReserveSlotCommand({ availabilityWindowId: command.availabilityWindowId }));

    const appointment = Appointment.request({
      patientId: command.patientId,
      doctorId: command.doctorId,
      availabilityWindowId: command.availabilityWindowId,
      consultationType: command.consultationType,
      scheduledAt: window.getStartTime(),
      reasonForVisit: command.reasonForVisit,
    });

    try {
      await this.appointmentRepository.save(appointment);
    } catch (error) {
      // Compensating action: the slot was already reserved (Held) above; if
      // persisting the Appointment fails, release it back rather than
      // leaving it Held with no Appointment ever referencing it.
      await this.releaseSlotUseCase.execute(new ReleaseSlotCommand({ availabilityWindowId: command.availabilityWindowId }));
      throw error;
    }
    await this.eventDispatcher.dispatch(appointment.releaseDomainEvents());

    return appointment;
  }
}
