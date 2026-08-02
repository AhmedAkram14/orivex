import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConflictError, ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { Appointment } from '../../../domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import { FollowUpRecommendation } from '../../../domain/entities/follow-up-recommendation.entity.js';
import { ConsultationType } from '../../../domain/enums/consultation-type.enum.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';
import type { FollowUpRecommendationRepository } from '../../../domain/repositories/follow-up-recommendation.repository.js';

import { RecommendFollowUpCommand } from './recommend-follow-up.command.js';
import { RecommendFollowUpUseCase } from './recommend-follow-up.use-case.js';

const DOCTOR_ID = '11111111-1111-4111-8111-111111111111';
const DOCTOR_ACCOUNT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_DOCTOR_ACCOUNT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

class FakeFollowUpRecommendationRepository implements FollowUpRecommendationRepository {
  public readonly saved: FollowUpRecommendation[] = [];
  constructor(private existing: FollowUpRecommendation | null = null) {}
  async findByConsultationSessionId(): Promise<FollowUpRecommendation | null> {
    return this.existing;
  }
  async save(recommendation: FollowUpRecommendation): Promise<void> {
    this.saved.push(recommendation);
    this.existing = recommendation;
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
  async countByDoctorIds(): Promise<Map<string, number>> {
    return new Map();
  }
  async countByStatusForDoctor(): Promise<Partial<Record<string, number>>> {
    return {};
  }
  async save(): Promise<void> {}
}

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly doctor: DoctorProfile | null) {}
  async findById(): Promise<DoctorProfile | null> {
    return this.doctor;
  }
  async findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    return this.doctor && this.doctor.getAccountId() === accountId ? this.doctor : null;
  }
  async save(): Promise<void> {}
}

function buildDoctor(accountId: string): DoctorProfile {
  return DoctorProfile.reconstitute({
    id: DOCTOR_ID,
    accountId,
    licenseNumber: 'LIC-1',
    languages: [],
    publications: [],
    awards: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    specialtyId: '22222222-2222-4222-8222-222222222222',
  });
}

function buildSessionAndAppointment(): { appointment: Appointment; session: ConsultationSession } {
  const appointment = Appointment.request({
    patientId: '33333333-3333-4333-8333-333333333333',
    doctorId: DOCTOR_ID,
    availabilityWindowId: '44444444-4444-4444-8444-444444444444',
    consultationType: ConsultationType.Free,
    scheduledAt: new Date(Date.now() + 60 * 60_000),
  });
  appointment.confirm();
  const session = ConsultationSession.open(appointment.getId());
  session.start();
  return { appointment, session };
}

function buildUseCase(props: {
  session: ConsultationSession | null;
  appointment: Appointment | null;
  doctor: DoctorProfile | null;
  followUpRepo?: FakeFollowUpRecommendationRepository;
}): { useCase: RecommendFollowUpUseCase; followUpRepo: FakeFollowUpRecommendationRepository } {
  const followUpRepo = props.followUpRepo ?? new FakeFollowUpRecommendationRepository();
  const useCase = new RecommendFollowUpUseCase(
    followUpRepo,
    new FakeConsultationSessionRepository(props.session),
    new FakeAppointmentRepository(props.appointment),
    new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(props.doctor)),
  );
  return { useCase, followUpRepo };
}

describe('RecommendFollowUpUseCase', () => {
  it('records a follow-up recommendation for the treating doctor', async () => {
    const { appointment, session } = buildSessionAndAppointment();
    const doctor = buildDoctor(DOCTOR_ACCOUNT_ID);
    const { useCase, followUpRepo } = buildUseCase({ session, appointment, doctor });

    const recommendation = await useCase.execute(
      new RecommendFollowUpCommand({
        consultationSessionId: session.getId(),
        authoringDoctorAccountId: DOCTOR_ACCOUNT_ID,
        reason: 'Re-check in two weeks.',
      }),
    );

    assert.equal(recommendation.getAuthoringDoctorId(), DOCTOR_ID);
    assert.equal(followUpRepo.saved.length, 1);
  });

  it("rejects a doctor who isn't the treating doctor for this consultation", async () => {
    const { appointment, session } = buildSessionAndAppointment();
    const otherDoctor = DoctorProfile.reconstitute({
      id: '99999999-9999-4999-8999-999999999999',
      accountId: OTHER_DOCTOR_ACCOUNT_ID,
      licenseNumber: 'LIC-2',
      languages: [],
      publications: [],
      awards: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      specialtyId: '22222222-2222-4222-8222-222222222222',
    });
    const { useCase } = buildUseCase({ session, appointment, doctor: otherDoctor });

    await assert.rejects(
      () =>
        useCase.execute(
          new RecommendFollowUpCommand({
            consultationSessionId: session.getId(),
            authoringDoctorAccountId: OTHER_DOCTOR_ACCOUNT_ID,
            reason: 'Re-check in two weeks.',
          }),
        ),
      ForbiddenError,
    );
  });

  it('rejects a second follow-up recommendation for the same consultation', async () => {
    const { appointment, session } = buildSessionAndAppointment();
    const doctor = buildDoctor(DOCTOR_ACCOUNT_ID);
    const existing = FollowUpRecommendation.recommend({
      consultationSessionId: session.getId(),
      authoringDoctorId: DOCTOR_ID,
      reason: 'Already recommended.',
    });
    const followUpRepo = new FakeFollowUpRecommendationRepository(existing);
    const { useCase } = buildUseCase({ session, appointment, doctor, followUpRepo });

    await assert.rejects(
      () =>
        useCase.execute(
          new RecommendFollowUpCommand({
            consultationSessionId: session.getId(),
            authoringDoctorAccountId: DOCTOR_ACCOUNT_ID,
            reason: 'Trying again.',
          }),
        ),
      ConflictError,
    );
  });

  it('throws NotFoundError when the session does not exist', async () => {
    const { useCase } = buildUseCase({ session: null, appointment: null, doctor: null });

    await assert.rejects(
      () =>
        useCase.execute(
          new RecommendFollowUpCommand({
            consultationSessionId: 'missing-id',
            authoringDoctorAccountId: DOCTOR_ACCOUNT_ID,
            reason: 'Re-check in two weeks.',
          }),
        ),
      NotFoundError,
    );
  });
});
