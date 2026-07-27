import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { Appointment } from '../../../domain/entities/appointment.entity.js';
import { ConsultationFeedback } from '../../../domain/entities/consultation-feedback.entity.js';
import { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import { ConsultationCompletionReason } from '../../../domain/enums/consultation-completion-reason.enum.js';
import { ConsultationType } from '../../../domain/enums/consultation-type.enum.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { ConsultationFeedbackRepository, DoctorRatingAggregate } from '../../../domain/repositories/consultation-feedback.repository.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';

import { SubmitConsultationFeedbackCommand } from './submit-consultation-feedback.command.js';
import { SubmitConsultationFeedbackUseCase } from './submit-consultation-feedback.use-case.js';

const PATIENT_ID = '11111111-1111-4111-8111-111111111111';
const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';
const PATIENT_ACCOUNT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_PATIENT_ACCOUNT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

class FakeConsultationFeedbackRepository implements ConsultationFeedbackRepository {
  public readonly saved: ConsultationFeedback[] = [];
  constructor(private existing: ConsultationFeedback | null = null) {}
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
  async save(feedback: ConsultationFeedback): Promise<void> {
    this.saved.push(feedback);
    this.existing = feedback;
  }
}

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  constructor(private readonly session: ConsultationSession | null) {}
  async findById(): Promise<ConsultationSession | null> {
    return this.session;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return this.session;
  }
  async save(): Promise<void> {}
}

class FakeAppointmentRepository implements AppointmentRepository {
  constructor(private readonly appointment: Appointment | null) {}
  async findById(): Promise<Appointment | null> {
    return this.appointment;
  }
  async findByPatientId(): Promise<Appointment[]> {
    return this.appointment ? [this.appointment] : [];
  }
  async findByPatientIdPage(): Promise<Appointment[]> {
    return this.appointment ? [this.appointment] : [];
  }
  async countByPatientId(): Promise<number> {
    return this.appointment ? 1 : 0;
  }
  async findByDoctorId(): Promise<Appointment[]> {
    return this.appointment ? [this.appointment] : [];
  }
  async findByDoctorIdForDateRange(): Promise<Appointment[]> {
    return this.appointment ? [this.appointment] : [];
  }
  async save(): Promise<void> {}
}

class FakePatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly patient: PatientProfile | null) {}
  async findById(): Promise<PatientProfile | null> {
    return this.patient;
  }
  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    return this.patient && this.patient.getAccountId() === accountId ? this.patient : null;
  }
  async save(): Promise<void> {}
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}
  subscribe(): void {}
}

function buildCompletedSession(): { appointment: Appointment; session: ConsultationSession } {
  const appointment = Appointment.request({
    patientId: PATIENT_ID,
    doctorId: DOCTOR_ID,
    availabilityWindowId: '33333333-3333-4333-8333-333333333333',
    consultationType: ConsultationType.Free,
    scheduledAt: new Date(Date.now() + 60 * 60_000),
  });
  appointment.confirm();
  const session = ConsultationSession.open(appointment.getId());
  session.start();
  session.close(ConsultationCompletionReason.Completed);
  appointment.complete();
  return { appointment, session };
}

function buildUseCase(props: {
  session: ConsultationSession | null;
  appointment: Appointment | null;
  patient: PatientProfile | null;
  feedbackRepo?: FakeConsultationFeedbackRepository;
}): { useCase: SubmitConsultationFeedbackUseCase; feedbackRepo: FakeConsultationFeedbackRepository } {
  const feedbackRepo = props.feedbackRepo ?? new FakeConsultationFeedbackRepository();
  const useCase = new SubmitConsultationFeedbackUseCase(
    feedbackRepo,
    new FakeConsultationSessionRepository(props.session),
    new FakeAppointmentRepository(props.appointment),
    new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(props.patient)),
    new NoopDispatcher(),
  );
  return { useCase, feedbackRepo };
}

describe('SubmitConsultationFeedbackUseCase', () => {
  it('submits feedback for a genuinely completed consultation owned by the caller', async () => {
    const { appointment, session } = buildCompletedSession();
    // reconstitute (not create) so the patient's id matches the
    // appointment's own patientId exactly, for a clean fixture.
    const patient = PatientProfile.reconstitute({
      id: PATIENT_ID,
      accountId: PATIENT_ACCOUNT_ID,
      emergencyContacts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { useCase, feedbackRepo } = buildUseCase({ session, appointment, patient });

    const feedback = await useCase.execute(
      new SubmitConsultationFeedbackCommand({
        consultationSessionId: session.getId(),
        patientAccountId: PATIENT_ACCOUNT_ID,
        rating: 5,
        comment: 'Excellent care.',
      }),
    );

    assert.equal(feedback.getDoctorId(), DOCTOR_ID);
    assert.equal(feedback.getPatientId(), PATIENT_ID);
    assert.equal(feedbackRepo.saved.length, 1);
  });

  it('rejects when the consultation has not been completed yet', async () => {
    const appointment = Appointment.request({
      patientId: PATIENT_ID,
      doctorId: DOCTOR_ID,
      availabilityWindowId: '33333333-3333-4333-8333-333333333333',
      consultationType: ConsultationType.Free,
      scheduledAt: new Date(Date.now() + 60 * 60_000),
    });
    appointment.confirm();
    const session = ConsultationSession.open(appointment.getId());
    session.start();
    // Never closed -- still InProgress.

    const patient = PatientProfile.reconstitute({
      id: PATIENT_ID,
      accountId: PATIENT_ACCOUNT_ID,
      emergencyContacts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const { useCase } = buildUseCase({ session, appointment, patient });

    await assert.rejects(
      () =>
        useCase.execute(
          new SubmitConsultationFeedbackCommand({
            consultationSessionId: session.getId(),
            patientAccountId: PATIENT_ACCOUNT_ID,
            rating: 5,
          }),
        ),
      ValidationError,
    );
  });

  it('rejects when the consultation was interrupted, not completed', async () => {
    const appointment = Appointment.request({
      patientId: PATIENT_ID,
      doctorId: DOCTOR_ID,
      availabilityWindowId: '33333333-3333-4333-8333-333333333333',
      consultationType: ConsultationType.Free,
      scheduledAt: new Date(Date.now() + 60 * 60_000),
    });
    appointment.confirm();
    const session = ConsultationSession.open(appointment.getId());
    session.start();
    session.close(ConsultationCompletionReason.InterruptedTechnical);

    const patient = PatientProfile.reconstitute({
      id: PATIENT_ID,
      accountId: PATIENT_ACCOUNT_ID,
      emergencyContacts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const { useCase } = buildUseCase({ session, appointment, patient });

    await assert.rejects(
      () =>
        useCase.execute(
          new SubmitConsultationFeedbackCommand({
            consultationSessionId: session.getId(),
            patientAccountId: PATIENT_ACCOUNT_ID,
            rating: 5,
          }),
        ),
      ValidationError,
    );
  });

  it("rejects a caller who isn't the treated patient", async () => {
    const { appointment, session } = buildCompletedSession();
    const otherPatient = PatientProfile.reconstitute({
      id: '99999999-9999-4999-8999-999999999999',
      accountId: OTHER_PATIENT_ACCOUNT_ID,
      emergencyContacts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const { useCase } = buildUseCase({ session, appointment, patient: otherPatient });

    await assert.rejects(
      () =>
        useCase.execute(
          new SubmitConsultationFeedbackCommand({
            consultationSessionId: session.getId(),
            patientAccountId: OTHER_PATIENT_ACCOUNT_ID,
            rating: 5,
          }),
        ),
      ForbiddenError,
    );
  });

  it('rejects a caller with no patient profile at all', async () => {
    const { appointment, session } = buildCompletedSession();
    const { useCase } = buildUseCase({ session, appointment, patient: null });

    await assert.rejects(
      () =>
        useCase.execute(
          new SubmitConsultationFeedbackCommand({
            consultationSessionId: session.getId(),
            patientAccountId: PATIENT_ACCOUNT_ID,
            rating: 5,
          }),
        ),
      ForbiddenError,
    );
  });

  it('rejects a second review for the same consultation', async () => {
    const { appointment, session } = buildCompletedSession();
    const patient = PatientProfile.reconstitute({
      id: PATIENT_ID,
      accountId: PATIENT_ACCOUNT_ID,
      emergencyContacts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const existing = ConsultationFeedback.submit({
      consultationSessionId: session.getId(),
      patientId: PATIENT_ID,
      doctorId: DOCTOR_ID,
      rating: 4,
    });
    const feedbackRepo = new FakeConsultationFeedbackRepository(existing);
    const { useCase } = buildUseCase({ session, appointment, patient, feedbackRepo });

    await assert.rejects(
      () =>
        useCase.execute(
          new SubmitConsultationFeedbackCommand({
            consultationSessionId: session.getId(),
            patientAccountId: PATIENT_ACCOUNT_ID,
            rating: 5,
          }),
        ),
      ConflictError,
    );
  });

  it('throws NotFoundError when the session does not exist', async () => {
    const { useCase } = buildUseCase({ session: null, appointment: null, patient: null });

    await assert.rejects(
      () =>
        useCase.execute(
          new SubmitConsultationFeedbackCommand({
            consultationSessionId: 'missing-id',
            patientAccountId: PATIENT_ACCOUNT_ID,
            rating: 5,
          }),
        ),
      NotFoundError,
    );
  });
});
