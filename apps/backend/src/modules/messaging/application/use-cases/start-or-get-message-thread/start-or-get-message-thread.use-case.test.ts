import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { Appointment } from '../../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationPricing } from '../../../../consultation/domain/value-objects/consultation-pricing.value-object.js';
import type { AppointmentRepository } from '../../../../consultation/domain/repositories/appointment.repository.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import type { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { MessageThread } from '../../../domain/entities/message-thread.entity.js';
import type { MessageThreadRepository } from '../../../domain/repositories/message-thread.repository.js';

import { StartOrGetMessageThreadCommand } from './start-or-get-message-thread.command.js';
import { StartOrGetMessageThreadUseCase } from './start-or-get-message-thread.use-case.js';

const PATIENT_ID = '11111111-1111-4111-8111-111111111111';
const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_ACCOUNT_ID = '99999999-9999-4999-8999-999999999999';

class FakeAppointmentRepository implements AppointmentRepository {
  constructor(private readonly appointment: Appointment | null) {}
  async findById(): Promise<Appointment | null> {
    return this.appointment;
  }
  async findByPatientId(): Promise<Appointment[]> {
    return [];
  }
  async findByPatientIdPage(): Promise<Appointment[]> {
    return [];
  }
  async countByPatientId(): Promise<number> {
    return 0;
  }
  async findByDoctorId(): Promise<Appointment[]> {
    return [];
  }
  async findByDoctorIdForDateRange(): Promise<Appointment[]> {
    return [];
  }
  async countByDoctorIds(): Promise<Map<string, number>> {
    return new Map();
  }
  async countByStatusForDoctor(): Promise<Partial<Record<string, number>>> {
    return {};
  }
  async findConfirmedPastJoinWindowMissed(): Promise<Appointment[]> {
    return [];
  }
  async countFreeConsultationsForPatientSince(): Promise<number> {
    return 0;
  }
  async countNoShowsForPatient(): Promise<number> {
    return 0;
  }
  async save(): Promise<void> {}
}

class FakePatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profileByAccountId: Map<string, PatientProfile>) {}
  async findById(): Promise<PatientProfile | null> {
    return null;
  }
  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    return this.profileByAccountId.get(accountId) ?? null;
  }
  async save(): Promise<void> {}
}

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profileByAccountId: Map<string, DoctorProfile>) {}
  async findById(): Promise<DoctorProfile | null> {
    return null;
  }
  async findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    return this.profileByAccountId.get(accountId) ?? null;
  }
  async save(): Promise<void> {}
}

class FakeMessageThreadRepository implements MessageThreadRepository {
  public readonly saved: MessageThread[] = [];
  constructor(private existing: MessageThread | null = null) {}
  async findById(id: string): Promise<MessageThread | null> {
    return this.existing?.getId() === id ? this.existing : null;
  }
  async findByAppointmentId(appointmentId: string): Promise<MessageThread | null> {
    return this.existing?.getAppointmentId() === appointmentId ? this.existing : null;
  }
  async findByPatientId(): Promise<MessageThread[]> {
    return [];
  }
  async findByDoctorId(): Promise<MessageThread[]> {
    return [];
  }
  async save(thread: MessageThread): Promise<void> {
    this.saved.push(thread);
    this.existing = thread;
  }
}

function buildAppointment(): Appointment {
  return Appointment.request({
    patientId: PATIENT_ID,
    doctorId: DOCTOR_ID,
    availabilityWindowId: '33333333-3333-4333-8333-333333333333',
    pricing: ConsultationPricing.free(),
    scheduledAt: new Date(Date.now() + 60 * 60_000),
  });
}

function buildUseCase(props: {
  appointment: Appointment | null;
  threadRepository: FakeMessageThreadRepository;
  patientAccountId?: string;
  doctorAccountId?: string;
}): StartOrGetMessageThreadUseCase {
  const patientProfiles = new Map<string, PatientProfile>();
  if (props.patientAccountId) {
    patientProfiles.set(props.patientAccountId, { getId: () => PATIENT_ID } as PatientProfile);
  }
  const doctorProfiles = new Map<string, DoctorProfile>();
  if (props.doctorAccountId) {
    doctorProfiles.set(props.doctorAccountId, { getId: () => DOCTOR_ID } as DoctorProfile);
  }
  return new StartOrGetMessageThreadUseCase(
    props.threadRepository,
    new GetAppointmentByIdUseCase(new FakeAppointmentRepository(props.appointment)),
    new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(patientProfiles)),
    new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(doctorProfiles)),
  );
}

describe('StartOrGetMessageThreadUseCase', () => {
  it('creates a new thread the first time the patient opens it', async () => {
    const appointment = buildAppointment();
    const threadRepository = new FakeMessageThreadRepository();
    const useCase = buildUseCase({ appointment, threadRepository, patientAccountId: 'patient-account' });

    const thread = await useCase.execute(
      new StartOrGetMessageThreadCommand({ appointmentId: appointment.getId(), callerAccountId: 'patient-account' }),
    );

    assert.equal(thread.getAppointmentId(), appointment.getId());
    assert.equal(thread.getPatientId(), PATIENT_ID);
    assert.equal(thread.getDoctorId(), DOCTOR_ID);
    assert.equal(threadRepository.saved.length, 1);
  });

  it('returns the existing thread on a second call instead of creating a duplicate', async () => {
    const appointment = buildAppointment();
    const threadRepository = new FakeMessageThreadRepository();
    const useCase = buildUseCase({ appointment, threadRepository, doctorAccountId: 'doctor-account' });
    const command = new StartOrGetMessageThreadCommand({ appointmentId: appointment.getId(), callerAccountId: 'doctor-account' });

    const first = await useCase.execute(command);
    const second = await useCase.execute(command);

    assert.equal(first.getId(), second.getId());
    assert.equal(threadRepository.saved.length, 1);
  });

  it('throws NotFoundError when the appointment does not exist', async () => {
    const threadRepository = new FakeMessageThreadRepository();
    const useCase = buildUseCase({ appointment: null, threadRepository, patientAccountId: 'patient-account' });

    await assert.rejects(
      () => useCase.execute(new StartOrGetMessageThreadCommand({ appointmentId: 'missing-id', callerAccountId: 'patient-account' })),
      NotFoundError,
    );
  });

  it('throws NotFoundError (never a distinguishing 403) when the caller is neither the patient nor the doctor', async () => {
    const appointment = buildAppointment();
    const threadRepository = new FakeMessageThreadRepository();
    const useCase = buildUseCase({ appointment, threadRepository });

    await assert.rejects(
      () =>
        useCase.execute(
          new StartOrGetMessageThreadCommand({ appointmentId: appointment.getId(), callerAccountId: OTHER_ACCOUNT_ID }),
        ),
      NotFoundError,
    );
  });
});
