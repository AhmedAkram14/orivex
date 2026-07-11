import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { ConfirmAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/confirm-availability-window/confirm-availability-window.use-case.js';
import { GetAvailabilityWindowByIdUseCase } from '../../../../doctor/application/use-cases/get-availability-window-by-id/get-availability-window-by-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { ReserveAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/reserve-availability-window/reserve-availability-window.use-case.js';
import { AvailabilityWindow } from '../../../../doctor/domain/entities/availability-window.entity.js';
import type { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import { ConsultationType as DoctorConsultationType } from '../../../../doctor/domain/enums/consultation-type.enum.js';
import type { AvailabilityWindowRepository } from '../../../../doctor/domain/repositories/availability-window.repository.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { ConfirmSlotUseCase } from '../../../../scheduling/application/use-cases/confirm-slot/confirm-slot.use-case.js';
import { ReserveSlotUseCase } from '../../../../scheduling/application/use-cases/reserve-slot/reserve-slot.use-case.js';
import type { Appointment } from '../../../domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../../domain/enums/appointment-status.enum.js';
import { ConsultationType } from '../../../domain/enums/consultation-type.enum.js';
import { ConsultationDomainError } from '../../../domain/exceptions/consultation-domain.error.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';
import { ConfirmAppointmentUseCase } from '../confirm-appointment/confirm-appointment.use-case.js';

import { BookAppointmentCommand } from './book-appointment.command.js';
import { BookAppointmentUseCase } from './book-appointment.use-case.js';

class FakeAppointmentRepository implements AppointmentRepository {
  public readonly saved: Appointment[] = [];
  private readonly byId = new Map<string, Appointment>();
  async findById(id: string): Promise<Appointment | null> {
    return this.byId.get(id) ?? null;
  }
  async save(appointment: Appointment): Promise<void> {
    this.saved.push(appointment);
    this.byId.set(appointment.getId(), appointment);
  }
}

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  async findById(): Promise<ConsultationSession | null> {
    return null;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return null;
  }
  async save(): Promise<void> {}
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
  async save(): Promise<void> {}
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}

  subscribe(): void {}
}

function buildWindow(consultationType: DoctorConsultationType = DoctorConsultationType.Free): AvailabilityWindow {
  const startTime = new Date(Date.now() + 60 * 60_000);
  return AvailabilityWindow.define({
    doctorId: '22222222-2222-4222-8222-222222222222',
    startTime,
    endTime: new Date(startTime.getTime() + 30 * 60_000),
    consultationType,
  });
}

function buildUseCase(props: {
  appointmentRepo: FakeAppointmentRepository;
  window: AvailabilityWindow | null;
  patient?: PatientProfile | null;
  doctor?: DoctorProfile | null;
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
    new ConfirmAppointmentUseCase(
      props.appointmentRepo,
      new FakeConsultationSessionRepository(),
      new ConfirmSlotUseCase(new ConfirmAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDispatcher())),
      new NoopDispatcher(),
    ),
  );
}

describe('BookAppointmentUseCase', () => {
  it('books and immediately confirms a free appointment', async () => {
    const window = buildWindow(DoctorConsultationType.Free);
    const appointmentRepo = new FakeAppointmentRepository();
    const useCase = buildUseCase({ appointmentRepo, window });

    const appointment = await useCase.execute(
      new BookAppointmentCommand({
        patientId: '11111111-1111-4111-8111-111111111111',
        doctorId: '22222222-2222-4222-8222-222222222222',
        availabilityWindowId: window.getId(),
        consultationType: ConsultationType.Free,
      }),
    );

    assert.equal(appointment.getStatus(), AppointmentStatus.Confirmed);
    assert.equal(appointmentRepo.saved.length, 2); // Requested, then Confirmed
  });

  it('books a paid appointment and leaves it Requested', async () => {
    const window = buildWindow(DoctorConsultationType.Paid);
    const appointmentRepo = new FakeAppointmentRepository();
    const useCase = buildUseCase({ appointmentRepo, window });

    const appointment = await useCase.execute(
      new BookAppointmentCommand({
        patientId: '11111111-1111-4111-8111-111111111111',
        doctorId: '22222222-2222-4222-8222-222222222222',
        availabilityWindowId: window.getId(),
        consultationType: ConsultationType.Paid,
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
            consultationType: ConsultationType.Free,
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
            consultationType: ConsultationType.Free,
          }),
        ),
      NotFoundError,
    );
  });

  it('throws ConsultationDomainError when consultationType does not match the window', async () => {
    const window = buildWindow(DoctorConsultationType.Paid);
    const useCase = buildUseCase({ appointmentRepo: new FakeAppointmentRepository(), window });

    await assert.rejects(
      () =>
        useCase.execute(
          new BookAppointmentCommand({
            patientId: '11111111-1111-4111-8111-111111111111',
            doctorId: '22222222-2222-4222-8222-222222222222',
            availabilityWindowId: window.getId(),
            consultationType: ConsultationType.Free,
          }),
        ),
      ConsultationDomainError,
    );
  });
});
