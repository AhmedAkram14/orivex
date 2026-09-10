import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConflictError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import type { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { Appointment } from '../../../domain/entities/appointment.entity.js';
import { Dispute } from '../../../domain/entities/dispute.entity.js';
import { ConsultationPricing } from '../../../domain/value-objects/consultation-pricing.value-object.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { DisputeRepository } from '../../../domain/repositories/dispute.repository.js';

import { RaiseDisputeCommand } from './raise-dispute.command.js';
import { RaiseDisputeUseCase } from './raise-dispute.use-case.js';

const PATIENT_ID = '11111111-1111-4111-8111-111111111111';
const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';

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

class FakeDisputeRepository implements DisputeRepository {
  public readonly saved: Dispute[] = [];
  constructor(private readonly existing: Dispute | null = null) {}
  async findById(): Promise<Dispute | null> {
    return null;
  }
  async findByAppointmentId(): Promise<Dispute | null> {
    return this.existing;
  }
  async listByRaisedByAccountId(): Promise<Dispute[]> {
    return [];
  }
  async listByStatus(): Promise<{ disputes: Dispute[]; total: number }> {
    return { disputes: [], total: 0 };
  }
  async save(dispute: Dispute): Promise<void> {
    this.saved.push(dispute);
  }
  async update(): Promise<void> {}
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
  disputeRepository: FakeDisputeRepository;
  patientAccountId?: string;
  doctorAccountId?: string;
}): RaiseDisputeUseCase {
  const patientProfiles = new Map<string, PatientProfile>();
  if (props.patientAccountId) {
    patientProfiles.set(props.patientAccountId, { getId: () => PATIENT_ID } as PatientProfile);
  }
  const doctorProfiles = new Map<string, DoctorProfile>();
  if (props.doctorAccountId) {
    doctorProfiles.set(props.doctorAccountId, { getId: () => DOCTOR_ID } as DoctorProfile);
  }
  return new RaiseDisputeUseCase(
    props.disputeRepository,
    new FakeAppointmentRepository(props.appointment),
    new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(patientProfiles)),
    new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(doctorProfiles)),
  );
}

describe('RaiseDisputeUseCase', () => {
  it('lets the patient party raise a dispute', async () => {
    const appointment = buildAppointment();
    const disputeRepository = new FakeDisputeRepository();
    const useCase = buildUseCase({ appointment, disputeRepository, patientAccountId: 'patient-account' });

    const dispute = await useCase.execute(
      new RaiseDisputeCommand({ appointmentId: appointment.getId(), callerAccountId: 'patient-account', reason: 'Doctor no-show.' }),
    );

    assert.equal(dispute.getAppointmentId(), appointment.getId());
    assert.equal(disputeRepository.saved.length, 1);
  });

  it('lets the doctor party raise a dispute', async () => {
    const appointment = buildAppointment();
    const disputeRepository = new FakeDisputeRepository();
    const useCase = buildUseCase({ appointment, disputeRepository, doctorAccountId: 'doctor-account' });

    const dispute = await useCase.execute(
      new RaiseDisputeCommand({ appointmentId: appointment.getId(), callerAccountId: 'doctor-account', reason: 'Patient was abusive.' }),
    );

    assert.equal(dispute.getRaisedByAccountId(), 'doctor-account');
  });

  it('throws NotFoundError when the appointment does not exist', async () => {
    const disputeRepository = new FakeDisputeRepository();
    const useCase = buildUseCase({ appointment: null, disputeRepository, patientAccountId: 'patient-account' });

    await assert.rejects(
      () => useCase.execute(new RaiseDisputeCommand({ appointmentId: 'missing-id', callerAccountId: 'patient-account', reason: 'r' })),
      NotFoundError,
    );
  });

  it('throws NotFoundError for a caller who is not a party to the appointment', async () => {
    const appointment = buildAppointment();
    const disputeRepository = new FakeDisputeRepository();
    const useCase = buildUseCase({ appointment, disputeRepository });

    await assert.rejects(
      () => useCase.execute(new RaiseDisputeCommand({ appointmentId: appointment.getId(), callerAccountId: 'stranger-account', reason: 'r' })),
      NotFoundError,
    );
  });

  it('throws ConflictError when a dispute already exists for this appointment', async () => {
    const appointment = buildAppointment();
    const existing = Dispute.raise({ appointmentId: appointment.getId(), raisedByAccountId: 'patient-account', reason: 'first' });
    const disputeRepository = new FakeDisputeRepository(existing);
    const useCase = buildUseCase({ appointment, disputeRepository, patientAccountId: 'patient-account' });

    await assert.rejects(
      () => useCase.execute(new RaiseDisputeCommand({ appointmentId: appointment.getId(), callerAccountId: 'patient-account', reason: 'second' })),
      ConflictError,
    );
  });
});
