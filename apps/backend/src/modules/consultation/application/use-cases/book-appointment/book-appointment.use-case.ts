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
import { FreeTierMonthlyCapExceededError } from '../../../domain/exceptions/free-tier-monthly-cap-exceeded.error.js';
import { NoShowBookingRestrictedError } from '../../../domain/exceptions/no-show-booking-restricted.error.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { FreeTierBookingRepository } from '../../../domain/repositories/free-tier-booking.repository.js';
import { toConsultationModulePricing } from '../../mappers/to-consultation-pricing.js';

import type { BookAppointmentCommand } from './book-appointment.command.js';

// I8 -- Free-tier abuse controls (docs/01-prd.md §7, release checklist:
// "implemented before public launch, not added reactively"). Flat platform-
// wide constants, not per-doctor configurable -- matches PLATFORM_COMMISSION
// _RATE's own "disclosed, not editable per-account" precedent (get-doctor-
// earnings-summary.use-case.ts). A patient with 2+ no-shows on record loses
// free-tier booking entirely (still free to book Paid) until support
// intervenes -- there is no automatic reinstatement path yet, a real,
// disclosed limitation.
export const MAX_FREE_CONSULTATIONS_PER_MONTH = 3;
export const MAX_NO_SHOWS_BEFORE_FREE_TIER_BLOCKED = 2;

function startOfCurrentMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

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
    private readonly freeTierBookingRepository: FreeTierBookingRepository,
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

    const isFree = window.getPricing().isFree();

    await this.reserveSlotUseCase.execute(new ReserveSlotCommand({ availabilityWindowId: command.availabilityWindowId }));

    // Consultation Pricing Redesign: the window's own pricing is snapshotted
    // onto the Appointment here, at booking time -- the one and only moment
    // it's copied. A later reprice of the window (impossible anyway once
    // Held, but still) can never retroactively change what this specific
    // appointment was agreed to cost.
    const appointment = Appointment.request({
      patientId: command.patientId,
      doctorId: command.doctorId,
      availabilityWindowId: command.availabilityWindowId,
      pricing: toConsultationModulePricing(window.getPricing()),
      scheduledAt: window.getStartTime(),
      endTime: window.getEndTime(),
      reasonForVisit: command.reasonForVisit,
      appointmentType: command.appointmentType,
    });

    if (isFree) {
      // I8 -- Free-tier abuse controls, concurrency fix: the no-show/monthly
      // cap re-check and the appointment insert must be atomic, or two
      // concurrent free bookings for the same patient could each read a
      // stale, still-under-cap count and both succeed -- FreeTierBookingRepository
      // performs both inside one Postgres transaction, serialized per patient
      // via a transaction-scoped advisory lock (see its own doc comment).
      let outcome;
      try {
        outcome = await this.freeTierBookingRepository.checkCapsAndSave(appointment, command.patientId, {
          maxFreeConsultationsPerMonth: MAX_FREE_CONSULTATIONS_PER_MONTH,
          maxNoShowsBeforeBlocked: MAX_NO_SHOWS_BEFORE_FREE_TIER_BLOCKED,
          freeConsultationsWindowStart: startOfCurrentMonthUtc(),
        });
      } catch (error) {
        await this.releaseSlotUseCase.execute(new ReleaseSlotCommand({ availabilityWindowId: command.availabilityWindowId }));
        throw error;
      }

      if (outcome !== 'booked') {
        // Compensating action, same as the persistence-failure path below:
        // the slot was already reserved (Held) above and must not be left
        // stranded when the booking is rejected.
        await this.releaseSlotUseCase.execute(new ReleaseSlotCommand({ availabilityWindowId: command.availabilityWindowId }));
        if (outcome === 'no_show_blocked') {
          throw new NoShowBookingRestrictedError(
            'This account has too many missed free consultations and can no longer book free appointments. Please book a paid consultation instead.',
          );
        }
        throw new FreeTierMonthlyCapExceededError(
          `This account has already used its ${MAX_FREE_CONSULTATIONS_PER_MONTH} free consultations for this month. Please book a paid consultation instead.`,
        );
      }
    } else {
      try {
        await this.appointmentRepository.save(appointment);
      } catch (error) {
        // Compensating action: the slot was already reserved (Held) above; if
        // persisting the Appointment fails, release it back rather than
        // leaving it Held with no Appointment ever referencing it.
        await this.releaseSlotUseCase.execute(new ReleaseSlotCommand({ availabilityWindowId: command.availabilityWindowId }));
        throw error;
      }
    }

    await this.eventDispatcher.dispatch(appointment.releaseDomainEvents());

    return appointment;
  }
}
