import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { RealtimeEmitterPort } from '../../../../../platform/realtime/ports/realtime-emitter.port.js';
import { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { ConsultationFeedback } from '../../../domain/entities/consultation-feedback.entity.js';
import type { ConsultationFeedbackRepository, DoctorRatingAggregate } from '../../../domain/repositories/consultation-feedback.repository.js';

import { DeleteConsultationFeedbackCommand } from './delete-consultation-feedback.command.js';
import { DeleteConsultationFeedbackUseCase } from './delete-consultation-feedback.use-case.js';

class FakeConsultationFeedbackRepository implements ConsultationFeedbackRepository {
  public deletedIds: string[] = [];
  constructor(private existing: ConsultationFeedback | null) {}
  async findByConsultationSessionId(): Promise<ConsultationFeedback | null> {
    return this.existing;
  }
  async listForDoctor(): Promise<{ feedback: ConsultationFeedback[]; total: number }> {
    return { feedback: [], total: 0 };
  }
  async getRatingAggregateForDoctor(): Promise<DoctorRatingAggregate> {
    return { averageRating: null, reviewCount: 0 };
  }
  async getRatingAggregatesForDoctors(): Promise<Map<string, DoctorRatingAggregate>> {
    return new Map();
  }
  async save(): Promise<void> {}
  async update(): Promise<void> {}
  async delete(id: string): Promise<void> {
    this.deletedIds.push(id);
  }
}

class FakePatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profile: PatientProfile | null) {}
  async findById(): Promise<PatientProfile | null> {
    return this.profile;
  }
  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    return this.profile && this.profile.getAccountId() === accountId ? this.profile : null;
  }
  async save(): Promise<void> {}
}

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile | null) {}
  async findById(id: string): Promise<DoctorProfile | null> {
    return this.profile && this.profile.getId() === id ? this.profile : null;
  }
  async findByAccountId(): Promise<DoctorProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class FakeRealtimeEmitter implements RealtimeEmitterPort {
  public emitted: { accountId: string; event: string; payload: unknown }[] = [];
  emitToAccount(accountId: string, event: string, payload: unknown): void {
    this.emitted.push({ accountId, event, payload });
  }
}

describe('DeleteConsultationFeedbackUseCase', () => {
  it("deletes the feedback row and pushes a live 'doctor-reviews.changed' event to the doctor's own account", async () => {
    const patient = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    const doctor = DoctorProfile.register({
      accountId: '22222222-2222-4222-8222-222222222222',
      licenseNumber: 'LIC-1',
      specialtyId: '33333333-3333-4333-8333-333333333333',
    });
    const feedback = ConsultationFeedback.submit({
      consultationSessionId: '44444444-4444-4444-8444-444444444444',
      patientId: patient.getId(),
      doctorId: doctor.getId(),
      rating: 3,
    });

    const feedbackRepo = new FakeConsultationFeedbackRepository(feedback);
    const realtimeEmitter = new FakeRealtimeEmitter();
    const useCase = new DeleteConsultationFeedbackUseCase(
      feedbackRepo,
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(patient)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(doctor)),
      realtimeEmitter,
    );

    await useCase.execute(
      new DeleteConsultationFeedbackCommand({
        consultationSessionId: feedback.getConsultationSessionId(),
        patientAccountId: patient.getAccountId(),
      }),
    );

    assert.deepEqual(feedbackRepo.deletedIds, [feedback.getId()]);
    assert.equal(realtimeEmitter.emitted.length, 1);
    assert.equal(realtimeEmitter.emitted[0].accountId, doctor.getAccountId());
    assert.equal(realtimeEmitter.emitted[0].event, 'doctor-reviews.changed');
  });

  it('throws NotFoundError when no feedback exists yet for the session', async () => {
    const patient = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    const useCase = new DeleteConsultationFeedbackUseCase(
      new FakeConsultationFeedbackRepository(null),
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(patient)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(null)),
      new FakeRealtimeEmitter(),
    );

    await assert.rejects(
      () =>
        useCase.execute(
          new DeleteConsultationFeedbackCommand({
            consultationSessionId: '99999999-9999-4999-8999-999999999999',
            patientAccountId: patient.getAccountId(),
          }),
        ),
      NotFoundError,
    );
  });

  it('throws ForbiddenError when the caller is not the original reviewer', async () => {
    const patient = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    const otherPatient = PatientProfile.create({ accountId: '55555555-5555-4555-8555-555555555555' });
    const doctor = DoctorProfile.register({
      accountId: '22222222-2222-4222-8222-222222222222',
      licenseNumber: 'LIC-1',
      specialtyId: '33333333-3333-4333-8333-333333333333',
    });
    const feedback = ConsultationFeedback.submit({
      consultationSessionId: '44444444-4444-4444-8444-444444444444',
      patientId: patient.getId(),
      doctorId: doctor.getId(),
      rating: 3,
    });

    const useCase = new DeleteConsultationFeedbackUseCase(
      new FakeConsultationFeedbackRepository(feedback),
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(otherPatient)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(doctor)),
      new FakeRealtimeEmitter(),
    );

    await assert.rejects(
      () =>
        useCase.execute(
          new DeleteConsultationFeedbackCommand({
            consultationSessionId: feedback.getConsultationSessionId(),
            patientAccountId: otherPatient.getAccountId(),
          }),
        ),
      ForbiddenError,
    );
  });
});
