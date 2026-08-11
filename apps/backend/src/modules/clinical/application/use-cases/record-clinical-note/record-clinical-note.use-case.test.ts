import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { Appointment } from '../../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../../../consultation/domain/entities/consultation-session.entity.js';
import { ConsultationPricing } from '../../../../consultation/domain/value-objects/consultation-pricing.value-object.js';
import type { AppointmentRepository } from '../../../../consultation/domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../../consultation/domain/repositories/consultation-session.repository.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { ClinicalNote } from '../../../domain/entities/clinical-note.entity.js';
import type { ClinicalNoteRepository } from '../../../domain/repositories/clinical-note.repository.js';

import { RecordClinicalNoteCommand } from './record-clinical-note.command.js';
import { RecordClinicalNoteUseCase } from './record-clinical-note.use-case.js';

class FakeClinicalNoteRepository implements ClinicalNoteRepository {
  public readonly saved: ClinicalNote[] = [];
  async findById(): Promise<ClinicalNote | null> {
    return null;
  }
  async findByConsultationSessionId(): Promise<ClinicalNote[]> {
    return [];
  }
  async save(note: ClinicalNote): Promise<void> {
    this.saved.push(note);
  }
}

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  constructor(private readonly session: ConsultationSession | null) {}
  async findById(): Promise<ConsultationSession | null> {
    return this.session;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return null;
  }
  async findStale(): Promise<ConsultationSession[]> {
    return [];
  }
  async save(): Promise<void> {}
}

class FakeAppointmentRepository implements AppointmentRepository {
  constructor(private readonly appointment: Appointment | null) {}
  async findById(): Promise<Appointment | null> {
    return this.appointment;
  }
  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return this.appointment && this.appointment.getPatientId() === patientId ? [this.appointment] : [];
  }
  async findByPatientIdPage(patientId: string, skip: number, take: number): Promise<Appointment[]> {
    return (await this.findByPatientId(patientId)).slice(skip, skip + take);
  }
  async countByPatientId(patientId: string): Promise<number> {
    return (await this.findByPatientId(patientId)).length;
  }
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return this.appointment && this.appointment.getDoctorId() === doctorId ? [this.appointment] : [];
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

function buildScenario() {
  const appointment = Appointment.request({
    patientId: '11111111-1111-4111-8111-111111111111',
    doctorId: '22222222-2222-4222-8222-222222222222',
    availabilityWindowId: '33333333-3333-4333-8333-333333333333',
    pricing: ConsultationPricing.free(),
    scheduledAt: new Date(Date.now() + 60 * 60_000),
  });
  const session = ConsultationSession.open(appointment.getId());
  return { appointment, session };
}

function buildUseCase(props: {
  appointment: Appointment | null;
  session: ConsultationSession | null;
  doctor: DoctorProfile | null;
  repo: FakeClinicalNoteRepository;
}): RecordClinicalNoteUseCase {
  return new RecordClinicalNoteUseCase(
    props.repo,
    new GetConsultationSessionByIdUseCase(new FakeConsultationSessionRepository(props.session)),
    new GetAppointmentByIdUseCase(new FakeAppointmentRepository(props.appointment)),
    new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(props.doctor)),
  );
}

describe('RecordClinicalNoteUseCase', () => {
  it('records a note for the treating doctor of an existing session', async () => {
    const { appointment, session } = buildScenario();
    const repo = new FakeClinicalNoteRepository();
    const useCase = buildUseCase({ appointment, session, doctor: {} as DoctorProfile, repo });

    const note = await useCase.execute(
      new RecordClinicalNoteCommand({
        consultationSessionId: session.getId(),
        authoringDoctorId: appointment.getDoctorId(),
        content: 'SOAP note',
      }),
    );

    assert.equal(note.getContent(), 'SOAP note');
    assert.equal(repo.saved.length, 1);
  });

  it('throws NotFoundError when the session does not exist', async () => {
    const { appointment } = buildScenario();
    const repo = new FakeClinicalNoteRepository();
    const useCase = buildUseCase({ appointment, session: null, doctor: {} as DoctorProfile, repo });

    await assert.rejects(
      () =>
        useCase.execute(
          new RecordClinicalNoteCommand({
            consultationSessionId: 'missing-id',
            authoringDoctorId: appointment.getDoctorId(),
            content: 'SOAP note',
          }),
        ),
      NotFoundError,
    );
  });

  it('throws NotFoundError when the doctor does not exist', async () => {
    const { appointment, session } = buildScenario();
    const repo = new FakeClinicalNoteRepository();
    const useCase = buildUseCase({ appointment, session, doctor: null, repo });

    await assert.rejects(
      () =>
        useCase.execute(
          new RecordClinicalNoteCommand({
            consultationSessionId: session.getId(),
            authoringDoctorId: 'missing-id',
            content: 'SOAP note',
          }),
        ),
      NotFoundError,
    );
  });

  it('throws ForbiddenError when authoringDoctorId is not the appointment\'s treating doctor', async () => {
    const { appointment, session } = buildScenario();
    const repo = new FakeClinicalNoteRepository();
    const useCase = buildUseCase({ appointment, session, doctor: {} as DoctorProfile, repo });

    await assert.rejects(
      () =>
        useCase.execute(
          new RecordClinicalNoteCommand({
            consultationSessionId: session.getId(),
            authoringDoctorId: '55555555-5555-4555-8555-555555555555',
            content: 'SOAP note',
          }),
        ),
      ForbiddenError,
    );
  });
});
