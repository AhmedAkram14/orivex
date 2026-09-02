import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Appointment } from '../../../../consultation/domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../../../consultation/domain/enums/appointment-status.enum.js';
import { ConsultationPricing } from '../../../../consultation/domain/value-objects/consultation-pricing.value-object.js';
import { ConsultationSession } from '../../../../consultation/domain/entities/consultation-session.entity.js';
import { ConsultationState } from '../../../../consultation/domain/enums/consultation-state.enum.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { ProfessionalRank } from '../../../../doctor/domain/enums/professional-rank.enum.js';
import { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import { VitalReading } from '../../../domain/entities/vital-reading.entity.js';
import { VitalType } from '../../../domain/enums/vital-type.enum.js';
import type { VitalReadingRepository } from '../../../domain/repositories/vital-reading.repository.js';

import { RecordVitalReadingCommand } from './record-vital-reading.command.js';
import { RecordVitalReadingUseCase } from './record-vital-reading.use-case.js';

const TREATING_DOCTOR_PROFILE_ID = '11111111-1111-4111-8111-111111111111';
const TREATING_DOCTOR_ACCOUNT_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_DOCTOR_ACCOUNT_ID = '33333333-3333-4333-8333-333333333333';
const PATIENT_ID = '44444444-4444-4444-8444-444444444444';
const APPOINTMENT_ID = '55555555-5555-4555-8555-555555555555';
const WINDOW_ID = '66666666-6666-4666-8666-666666666666';
const SESSION_ID = '77777777-7777-4777-8777-777777777777';

class FakeVitalReadingRepository implements VitalReadingRepository {
  public saved: VitalReading[] = [];
  async findByPatientId(): Promise<VitalReading[]> {
    return this.saved;
  }
  async findByConsultationSessionId(): Promise<VitalReading[]> {
    return this.saved;
  }
  async save(vitalReading: VitalReading): Promise<void> {
    this.saved.push(vitalReading);
  }
}

function buildFixtures() {
  const appointment = Appointment.reconstitute({
    id: APPOINTMENT_ID,
    patientId: PATIENT_ID,
    doctorId: TREATING_DOCTOR_PROFILE_ID,
    availabilityWindowId: WINDOW_ID,
    scheduledAt: new Date('2026-08-20T14:00:00.000Z'),
    status: AppointmentStatus.Completed,
    pricing: ConsultationPricing.free(),
    version: 1,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-20T14:30:00.000Z'),
  });

  const session = ConsultationSession.reconstitute({
    id: SESSION_ID,
    appointmentId: APPOINTMENT_ID,
    state: ConsultationState.Closed,
    connectionLogs: [],
    version: 1,
    startedAt: new Date('2026-08-20T14:00:00.000Z'),
    closedAt: new Date('2026-08-20T14:20:00.000Z'),
    createdAt: new Date('2026-08-20T14:00:00.000Z'),
    updatedAt: new Date('2026-08-20T14:20:00.000Z'),
  });

  const treatingDoctor = DoctorProfile.reconstitute({
    id: TREATING_DOCTOR_PROFILE_ID,
    accountId: TREATING_DOCTOR_ACCOUNT_ID,
    licenseNumber: 'EG-000',
    specialtyId: '88888888-8888-4888-8888-888888888888',
    professionalRank: ProfessionalRank.Specialist,
    languages: [],
    publications: [],
    awards: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const getConsultationSessionByIdUseCase = {
    execute: async () => session,
  } as unknown as GetConsultationSessionByIdUseCase;
  const getAppointmentByIdUseCase = {
    execute: async () => appointment,
  } as unknown as GetAppointmentByIdUseCase;
  const getDoctorProfileByAccountIdUseCase = {
    execute: async ({ accountId }: { accountId: string }) =>
      accountId === TREATING_DOCTOR_ACCOUNT_ID ? treatingDoctor : null,
  } as unknown as GetDoctorProfileByAccountIdUseCase;

  return { getConsultationSessionByIdUseCase, getAppointmentByIdUseCase, getDoctorProfileByAccountIdUseCase };
}

describe('RecordVitalReadingUseCase', () => {
  it('records a vital reading authored by the treating doctor, linked to the patient and session', async () => {
    const fixtures = buildFixtures();
    const repository = new FakeVitalReadingRepository();
    const useCase = new RecordVitalReadingUseCase(
      repository,
      fixtures.getConsultationSessionByIdUseCase,
      fixtures.getAppointmentByIdUseCase,
      fixtures.getDoctorProfileByAccountIdUseCase,
    );

    const result = await useCase.execute(
      new RecordVitalReadingCommand({
        consultationSessionId: SESSION_ID,
        authoringDoctorAccountId: TREATING_DOCTOR_ACCOUNT_ID,
        type: VitalType.Weight,
        value: 78,
      }),
    );

    assert.equal(result.getPatientId(), PATIENT_ID);
    assert.equal(result.getRecordedByDoctorId(), TREATING_DOCTOR_PROFILE_ID);
    assert.equal(result.getConsultationSessionId(), SESSION_ID);
    assert.equal(result.getValue(), 78);
    assert.equal(repository.saved.length, 1);
  });

  it('rejects a doctor who did not treat this specific consultation', async () => {
    const fixtures = buildFixtures();
    const repository = new FakeVitalReadingRepository();
    const useCase = new RecordVitalReadingUseCase(
      repository,
      fixtures.getConsultationSessionByIdUseCase,
      fixtures.getAppointmentByIdUseCase,
      fixtures.getDoctorProfileByAccountIdUseCase,
    );

    await assert.rejects(() =>
      useCase.execute(
        new RecordVitalReadingCommand({
          consultationSessionId: SESSION_ID,
          authoringDoctorAccountId: OTHER_DOCTOR_ACCOUNT_ID,
          type: VitalType.Weight,
          value: 78,
        }),
      ),
    );
    assert.equal(repository.saved.length, 0);
  });

  it('rejects an unknown consultation session', async () => {
    const fixtures = buildFixtures();
    fixtures.getConsultationSessionByIdUseCase.execute = async () => null;
    const repository = new FakeVitalReadingRepository();
    const useCase = new RecordVitalReadingUseCase(
      repository,
      fixtures.getConsultationSessionByIdUseCase,
      fixtures.getAppointmentByIdUseCase,
      fixtures.getDoctorProfileByAccountIdUseCase,
    );

    await assert.rejects(() =>
      useCase.execute(
        new RecordVitalReadingCommand({
          consultationSessionId: 'does-not-exist',
          authoringDoctorAccountId: TREATING_DOCTOR_ACCOUNT_ID,
          type: VitalType.Weight,
          value: 78,
        }),
      ),
    );
  });

  it('requires a diastolic value for a blood-pressure reading (domain rule, not re-implemented here)', async () => {
    const fixtures = buildFixtures();
    const repository = new FakeVitalReadingRepository();
    const useCase = new RecordVitalReadingUseCase(
      repository,
      fixtures.getConsultationSessionByIdUseCase,
      fixtures.getAppointmentByIdUseCase,
      fixtures.getDoctorProfileByAccountIdUseCase,
    );

    await assert.rejects(() =>
      useCase.execute(
        new RecordVitalReadingCommand({
          consultationSessionId: SESSION_ID,
          authoringDoctorAccountId: TREATING_DOCTOR_ACCOUNT_ID,
          type: VitalType.BloodPressure,
          value: 120,
        }),
      ),
    );
  });
});
