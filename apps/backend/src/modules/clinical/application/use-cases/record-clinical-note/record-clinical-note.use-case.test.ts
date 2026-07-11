import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { ConsultationSession } from '../../../../consultation/domain/entities/consultation-session.entity.js';
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

describe('RecordClinicalNoteUseCase', () => {
  it('records a note for an existing session and doctor', async () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    const repo = new FakeClinicalNoteRepository();
    const useCase = new RecordClinicalNoteUseCase(
      repo,
      new GetConsultationSessionByIdUseCase(new FakeConsultationSessionRepository(session)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository({} as DoctorProfile)),
    );

    const note = await useCase.execute(
      new RecordClinicalNoteCommand({
        consultationSessionId: session.getId(),
        authoringDoctorId: '22222222-2222-4222-8222-222222222222',
        content: 'SOAP note',
      }),
    );

    assert.equal(note.getContent(), 'SOAP note');
    assert.equal(repo.saved.length, 1);
  });

  it('throws NotFoundError when the session does not exist', async () => {
    const repo = new FakeClinicalNoteRepository();
    const useCase = new RecordClinicalNoteUseCase(
      repo,
      new GetConsultationSessionByIdUseCase(new FakeConsultationSessionRepository(null)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository({} as DoctorProfile)),
    );

    await assert.rejects(
      () =>
        useCase.execute(
          new RecordClinicalNoteCommand({
            consultationSessionId: 'missing-id',
            authoringDoctorId: '22222222-2222-4222-8222-222222222222',
            content: 'SOAP note',
          }),
        ),
      NotFoundError,
    );
  });

  it('throws NotFoundError when the doctor does not exist', async () => {
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    const repo = new FakeClinicalNoteRepository();
    const useCase = new RecordClinicalNoteUseCase(
      repo,
      new GetConsultationSessionByIdUseCase(new FakeConsultationSessionRepository(session)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(null)),
    );

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
});
