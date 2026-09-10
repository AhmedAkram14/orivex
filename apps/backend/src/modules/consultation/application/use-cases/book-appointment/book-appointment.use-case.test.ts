import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetAvailabilityWindowByIdUseCase } from '../../../../doctor/application/use-cases/get-availability-window-by-id/get-availability-window-by-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { ReleaseAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/release-availability-window/release-availability-window.use-case.js';
import { ReserveAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/reserve-availability-window/reserve-availability-window.use-case.js';
import { AvailabilityWindow } from '../../../../doctor/domain/entities/availability-window.entity.js';
import type { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import { ConsultationType as DoctorConsultationType } from '../../../../doctor/domain/enums/consultation-type.enum.js';
import type { AvailabilityWindowRepository } from '../../../../doctor/domain/repositories/availability-window.repository.js';
import { ConsultationPricing as DoctorConsultationPricing } from '../../../../doctor/domain/value-objects/consultation-pricing.value-object.js';
import { Money as DoctorMoney } from '../../../../doctor/domain/value-objects/money.value-object.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { ReleaseSlotUseCase } from '../../../../scheduling/application/use-cases/release-slot/release-slot.use-case.js';
import { ReserveSlotUseCase } from '../../../../scheduling/application/use-cases/reserve-slot/reserve-slot.use-case.js';
import type { Appointment } from '../../../domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../../domain/enums/appointment-status.enum.js';
import { ConsultationDomainError } from '../../../domain/exceptions/consultation-domain.error.js';
import { FreeTierMonthlyCapExceededError } from '../../../domain/exceptions/free-tier-monthly-cap-exceeded.error.js';
import { NoShowBookingRestrictedError } from '../../../domain/exceptions/no-show-booking-restricted.error.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type {
  FreeTierBookingCaps,
  FreeTierBookingOutcome,
  FreeTierBookingRepository,
} from '../../../domain/repositories/free-tier-booking.repository.js';

import { BookAppointmentCommand } from './book-appointment.command.js';
import { BookAppointmentUseCase } from './book-appointment.use-case.js';

class FakeAppointmentRepository implements AppointmentRepository {
  async findConfirmedPastJoinWindowMissed(): Promise<Appointment[]> {
    return [];
  }
  async countFreeConsultationsForPatientSince(): Promise<number> {
    return 0;
  }
  async countNoShowsForPatient(): Promise<number> {
    return 0;
  }
  public readonly saved: Appointment[] = [];
  public failOnSaveCount = 0;
  private readonly byId = new Map<string, Appointment>();
  async findById(id: string): Promise<Appointment | null> {
    return this.byId.get(id) ?? null;
  }
  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return Array.from(this.byId.values()).filter((a) => a.getPatientId() === patientId);
  }
  async findByPatientIdPage(patientId: string, skip: number, take: number): Promise<Appointment[]> {
    return (await this.findByPatientId(patientId)).slice(skip, skip + take);
  }
  async countByPatientId(patientId: string): Promise<number> {
    return (await this.findByPatientId(patientId)).length;
  }
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return Array.from(this.byId.values()).filter((a) => a.getDoctorId() === doctorId);
  }
  async findByDoctorIdForDateRange(doctorId: string): Promise<Appointment[]> {
    return this.findByDoctorId(doctorId);
  }
  async countByDoctorIds(): Promise<Map<string, number>> {
    return new Map();
  }
  async countByStatusForDoctor(): Promise<Partial<Record<string, number>>> {
    return {};
  }
  async save(appointment: Appointment): Promise<void> {
    if (this.failOnSaveCount > 0) {
      this.failOnSaveCount -= 1;
      throw new Error('simulated persistence failure');
    }
    this.saved.push(appointment);
    this.byId.set(appointment.getId(), appointment);
  }
}

// Mirrors PrismaFreeTierBookingRepository's own decision logic (no-show
// check, then monthly-cap check, then save) so these unit tests exercise
// BookAppointmentUseCase's branching/compensating-action behavior without a
// real database -- the atomicity/concurrency guarantee itself is proven
// separately, against real PostgreSQL (prisma-free-tier-booking.repository.integration.test.ts).
class FakeFreeTierBookingRepository implements FreeTierBookingRepository {
  public noShowCount = 0;
  public freeConsultationsThisMonth = 0;
  public failWith: Error | null = null;
  public readonly saved: Appointment[] = [];
  public calls = 0;

  async checkCapsAndSave(appointment: Appointment, _patientId: string, caps: FreeTierBookingCaps): Promise<FreeTierBookingOutcome> {
    this.calls += 1;
    if (this.failWith) {
      throw this.failWith;
    }
    if (this.noShowCount >= caps.maxNoShowsBeforeBlocked) {
      return 'no_show_blocked';
    }
    if (this.freeConsultationsThisMonth >= caps.maxFreeConsultationsPerMonth) {
      return 'monthly_cap_exceeded';
    }
    this.saved.push(appointment);
    return 'booked';
  }
}

class FakePatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profile: PatientProfile | null) {}
  async findById(): Promise<PatientProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<PatientProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile | null) {}
  async findById(): Promise<DoctorProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<DoctorProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class FakeAvailabilityWindowRepository implements AvailabilityWindowRepository {
  constructor(private readonly window: AvailabilityWindow | null) {}
  async findById(): Promise<AvailabilityWindow | null> {
    return this.window;
  }
  async findOverlapping(): Promise<AvailabilityWindow[]> {
    return [];
  }
  async findByDoctorAndRange(): Promise<AvailabilityWindow[]> {
    return [];
  }
  async save(): Promise<void> {}
  async deleteById(): Promise<void> {}
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}

  subscribe(): void {}
}

function buildWindow(consultationType: DoctorConsultationType = DoctorConsultationType.Free): AvailabilityWindow {
  const startTime = new Date(Date.now() + 60 * 60_000);
  const pricing =
    consultationType === DoctorConsultationType.Paid
      ? DoctorConsultationPricing.paid(DoctorMoney.create(500, 'EGP'))
      : DoctorConsultationPricing.free();
  return AvailabilityWindow.define({
    doctorId: '22222222-2222-4222-8222-222222222222',
    startTime,
    endTime: new Date(startTime.getTime() + 30 * 60_000),
    pricing,
  });
}

function buildUseCase(props: {
  appointmentRepo: FakeAppointmentRepository;
  window: AvailabilityWindow | null;
  patient?: PatientProfile | null;
  doctor?: DoctorProfile | null;
  freeTierBookingRepo?: FakeFreeTierBookingRepository;
}): BookAppointmentUseCase {
  const availabilityWindowRepo = new FakeAvailabilityWindowRepository(props.window);
  const patient = props.patient === undefined ? ({} as PatientProfile) : props.patient;
  const doctor = props.doctor === undefined ? ({} as DoctorProfile) : props.doctor;
  return new BookAppointmentUseCase(
    props.appointmentRepo,
    new NoopDispatcher(),
    new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(patient)),
    new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(doctor)),
    new GetAvailabilityWindowByIdUseCase(availabilityWindowRepo),
    new ReserveSlotUseCase(new ReserveAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDispatcher())),
    new ReleaseSlotUseCase(new ReleaseAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDispatcher())),
    props.freeTierBookingRepo ?? new FakeFreeTierBookingRepository(),
  );
}

describe('BookAppointmentUseCase', () => {
  // Doctor-approval-workflow fix: every booking (Free or Paid) now lands
  // Requested and stays there until the doctor explicitly approves it via
  // ApproveAppointmentUseCase -- this use case never auto-confirms either
  // kind anymore, superseding (and fully removing, not layering on top of)
  // the 2026-07-26 "temporarily auto-confirm Paid bookings too" workaround.
  it('books a free appointment as Requested, never auto-confirming it', async () => {
    const window = buildWindow(DoctorConsultationType.Free);
    const appointmentRepo = new FakeAppointmentRepository();
    const freeTierBookingRepo = new FakeFreeTierBookingRepository();
    const useCase = buildUseCase({ appointmentRepo, window, freeTierBookingRepo });

    const appointment = await useCase.execute(
      new BookAppointmentCommand({
        patientId: '11111111-1111-4111-8111-111111111111',
        doctorId: '22222222-2222-4222-8222-222222222222',
        availabilityWindowId: window.getId(),
      }),
    );

    assert.equal(appointment.getStatus(), AppointmentStatus.Requested);
    // A FREE booking is persisted through FreeTierBookingRepository's own
    // atomic check-and-save, never through AppointmentRepository.save()
    // directly -- see the concurrency-fix doc comment on that port.
    assert.equal(freeTierBookingRepo.saved.length, 1);
    assert.equal(appointmentRepo.saved.length, 0);
  });

  it('books a paid appointment as Requested the same way', async () => {
    const window = buildWindow(DoctorConsultationType.Paid);
    const appointmentRepo = new FakeAppointmentRepository();
    const useCase = buildUseCase({ appointmentRepo, window });

    const appointment = await useCase.execute(
      new BookAppointmentCommand({
        patientId: '11111111-1111-4111-8111-111111111111',
        doctorId: '22222222-2222-4222-8222-222222222222',
        availabilityWindowId: window.getId(),
      }),
    );

    assert.equal(appointment.getStatus(), AppointmentStatus.Requested);
    assert.equal(appointmentRepo.saved.length, 1);
  });

  it('throws NotFoundError when the patient does not exist', async () => {
    const window = buildWindow();
    const useCase = buildUseCase({ appointmentRepo: new FakeAppointmentRepository(), window, patient: null });

    await assert.rejects(
      () =>
        useCase.execute(
          new BookAppointmentCommand({
            patientId: '99999999-9999-4999-8999-999999999999',
            doctorId: '22222222-2222-4222-8222-222222222222',
            availabilityWindowId: window.getId(),
          }),
        ),
      NotFoundError,
    );
  });

  it('throws NotFoundError when the availability window does not exist', async () => {
    const useCase = buildUseCase({ appointmentRepo: new FakeAppointmentRepository(), window: null });

    await assert.rejects(
      () =>
        useCase.execute(
          new BookAppointmentCommand({
            patientId: '11111111-1111-4111-8111-111111111111',
            doctorId: '22222222-2222-4222-8222-222222222222',
            availabilityWindowId: '33333333-3333-4333-8333-333333333333',
          }),
        ),
      NotFoundError,
    );
  });

  // Consultation Pricing Redesign: the client no longer asserts a
  // consultationType that could mismatch the window's own pricing (pricing
  // is now always snapshotted straight from the window, never client-
  // supplied), so the equivalent "the request doesn't line up with this
  // window" guard that remains is the doctor-ownership check.
  it('throws ConsultationDomainError when the window does not belong to the requested doctor', async () => {
    const window = buildWindow(DoctorConsultationType.Paid);
    const useCase = buildUseCase({ appointmentRepo: new FakeAppointmentRepository(), window });

    await assert.rejects(
      () =>
        useCase.execute(
          new BookAppointmentCommand({
            patientId: '11111111-1111-4111-8111-111111111111',
            doctorId: '99999999-9999-4999-8999-999999999999',
            availabilityWindowId: window.getId(),
          }),
        ),
      ConsultationDomainError,
    );
  });

  it('releases the reserved slot if persisting a Paid appointment fails', async () => {
    const window = buildWindow(DoctorConsultationType.Paid);
    const availabilityWindowRepo = new FakeAvailabilityWindowRepository(window);
    const appointmentRepo = new FakeAppointmentRepository();
    appointmentRepo.failOnSaveCount = 1;
    const useCase = new BookAppointmentUseCase(
      appointmentRepo,
      new NoopDispatcher(),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository({} as PatientProfile)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository({} as DoctorProfile)),
      new GetAvailabilityWindowByIdUseCase(availabilityWindowRepo),
      new ReserveSlotUseCase(new ReserveAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDispatcher())),
      new ReleaseSlotUseCase(new ReleaseAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDispatcher())),
      new FakeFreeTierBookingRepository(),
    );

    await assert.rejects(() =>
      useCase.execute(
        new BookAppointmentCommand({
          patientId: '11111111-1111-4111-8111-111111111111',
          doctorId: '22222222-2222-4222-8222-222222222222',
          availabilityWindowId: window.getId(),
        }),
      ),
    );

    const releasedWindow = await availabilityWindowRepo.findById();
    assert.equal(releasedWindow?.getStatus(), 'open');
  });

  it('releases the reserved slot if the atomic free-tier check-and-save fails for a Free appointment', async () => {
    const window = buildWindow(DoctorConsultationType.Free);
    const availabilityWindowRepo = new FakeAvailabilityWindowRepository(window);
    const freeTierBookingRepo = new FakeFreeTierBookingRepository();
    freeTierBookingRepo.failWith = new Error('simulated transaction failure');
    const useCase = new BookAppointmentUseCase(
      new FakeAppointmentRepository(),
      new NoopDispatcher(),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository({} as PatientProfile)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository({} as DoctorProfile)),
      new GetAvailabilityWindowByIdUseCase(availabilityWindowRepo),
      new ReserveSlotUseCase(new ReserveAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDispatcher())),
      new ReleaseSlotUseCase(new ReleaseAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDispatcher())),
      freeTierBookingRepo,
    );

    await assert.rejects(() =>
      useCase.execute(
        new BookAppointmentCommand({
          patientId: '11111111-1111-4111-8111-111111111111',
          doctorId: '22222222-2222-4222-8222-222222222222',
          availabilityWindowId: window.getId(),
        }),
      ),
    );

    const releasedWindow = await availabilityWindowRepo.findById();
    assert.equal(releasedWindow?.getStatus(), 'open');
  });

  // I8 -- Free-tier abuse controls.
  it('throws FreeTierMonthlyCapExceededError when the patient has already used their monthly free-consultation cap', async () => {
    const window = buildWindow(DoctorConsultationType.Free);
    const appointmentRepo = new FakeAppointmentRepository();
    const freeTierBookingRepo = new FakeFreeTierBookingRepository();
    freeTierBookingRepo.freeConsultationsThisMonth = 3;
    const useCase = buildUseCase({ appointmentRepo, window, freeTierBookingRepo });

    await assert.rejects(
      () =>
        useCase.execute(
          new BookAppointmentCommand({
            patientId: '11111111-1111-4111-8111-111111111111',
            doctorId: '22222222-2222-4222-8222-222222222222',
            availabilityWindowId: window.getId(),
          }),
        ),
      FreeTierMonthlyCapExceededError,
    );
    assert.equal(freeTierBookingRepo.saved.length, 0);
  });

  it('throws NoShowBookingRestrictedError when the patient has too many no-shows, blocking free-tier booking', async () => {
    const window = buildWindow(DoctorConsultationType.Free);
    const appointmentRepo = new FakeAppointmentRepository();
    const freeTierBookingRepo = new FakeFreeTierBookingRepository();
    freeTierBookingRepo.noShowCount = 2;
    const useCase = buildUseCase({ appointmentRepo, window, freeTierBookingRepo });

    await assert.rejects(
      () =>
        useCase.execute(
          new BookAppointmentCommand({
            patientId: '11111111-1111-4111-8111-111111111111',
            doctorId: '22222222-2222-4222-8222-222222222222',
            availabilityWindowId: window.getId(),
          }),
        ),
      NoShowBookingRestrictedError,
    );
    assert.equal(freeTierBookingRepo.saved.length, 0);
  });

  it('never checks free-tier caps for a Paid booking, even with a high no-show count', async () => {
    const window = buildWindow(DoctorConsultationType.Paid);
    const appointmentRepo = new FakeAppointmentRepository();
    const freeTierBookingRepo = new FakeFreeTierBookingRepository();
    freeTierBookingRepo.noShowCount = 99;
    freeTierBookingRepo.freeConsultationsThisMonth = 99;
    const useCase = buildUseCase({ appointmentRepo, window, freeTierBookingRepo });

    const appointment = await useCase.execute(
      new BookAppointmentCommand({
        patientId: '11111111-1111-4111-8111-111111111111',
        doctorId: '22222222-2222-4222-8222-222222222222',
        availabilityWindowId: window.getId(),
      }),
    );

    assert.equal(appointment.getStatus(), AppointmentStatus.Requested);
    // Proves the Paid path never even calls the free-tier gateway.
    assert.equal(freeTierBookingRepo.calls, 0);
    assert.equal(appointmentRepo.saved.length, 1);
  });
});
