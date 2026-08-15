import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConsultationFeedback } from '../../../consultation/domain/entities/consultation-feedback.entity.js';
import { GetConsultationFeedbackForSessionUseCase } from '../../../consultation/application/use-cases/get-consultation-feedback-for-session/get-consultation-feedback-for-session.use-case.js';
import type { ConsultationFeedbackRepository, DoctorRatingAggregate } from '../../../consultation/domain/repositories/consultation-feedback.repository.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { Account } from '../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { AccountRepository, ListAccountsResult } from '../../../identity/domain/repositories/account.repository.js';
import { AccountId } from '../../../identity/domain/value-objects/account-id.value-object.js';
import { DisplayName } from '../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../identity/domain/value-objects/email-address.value-object.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import type { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

import { NotifyDoctorOfConsultationFeedbackSubmittedHandler } from './notify-doctor-of-consultation-feedback-submitted.handler.js';

class FakeConsultationFeedbackRepository implements ConsultationFeedbackRepository {
  constructor(private readonly feedback: ConsultationFeedback | null) {}
  async findByConsultationSessionId(consultationSessionId: string): Promise<ConsultationFeedback | null> {
    return this.feedback && this.feedback.getConsultationSessionId() === consultationSessionId ? this.feedback : null;
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
  async delete(): Promise<void> {}
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

class FakePatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profile: PatientProfile | null) {}
  async findById(id: string): Promise<PatientProfile | null> {
    return this.profile && this.profile.getId() === id ? this.profile : null;
  }
  async findByAccountId(): Promise<PatientProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class FakeAccountRepository implements AccountRepository {
  constructor(private readonly accounts: Account[]) {}
  async findById(id: AccountId): Promise<Account | null> {
    return this.accounts.find((account) => account.getId().equals(id)) ?? null;
  }
  async findByEmail(): Promise<Account | null> {
    return null;
  }
  async findAll(): Promise<ListAccountsResult> {
    return { accounts: this.accounts, total: this.accounts.length };
  }
  async save(): Promise<void> {}
}

class FakeNotificationRepository implements NotificationRepository {
  public saved: Notification[] = [];
  async findById(): Promise<Notification | null> {
    return null;
  }
  async findByAccountId(): Promise<Notification[]> {
    return [];
  }
  async findByAccountIdPage(): Promise<Notification[]> {
    return [];
  }
  async countByAccountId(): Promise<number> {
    return 0;
  }
  async save(notification: Notification): Promise<void> {
    this.saved.push(notification);
  }
}

class FakeLogger {
  public errors: unknown[] = [];
  error(message: unknown, ...rest: unknown[]): void {
    this.errors.push({ message, rest });
  }
}

function buildAccount(role: AccountRole, displayName: string): Account {
  return Account.register({
    email: EmailAddress.create(`${role}-${Math.random()}@orivex.dev`),
    role,
    displayName: DisplayName.create(displayName),
  });
}

describe('NotifyDoctorOfConsultationFeedbackSubmittedHandler', () => {
  it("notifies the doctor's own account with the rating, comment, and a link to their profile reviews", async () => {
    const doctorAccount = buildAccount(AccountRole.Doctor, 'Dr. Sarah Ahmed');
    const patientAccount = buildAccount(AccountRole.Patient, 'Amina Youssef');
    const doctorProfile = DoctorProfile.register({
      accountId: doctorAccount.getId().toString(),
      licenseNumber: 'LIC-1',
      specialtyId: '11111111-1111-4111-8111-111111111111',
    });
    const patientProfile = PatientProfile.create({ accountId: patientAccount.getId().toString() });
    const feedback = ConsultationFeedback.submit({
      consultationSessionId: '33333333-3333-4333-8333-333333333333',
      patientId: patientProfile.getId(),
      doctorId: doctorProfile.getId(),
      rating: 5,
      comment: 'Excellent care.',
    });

    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyDoctorOfConsultationFeedbackSubmittedHandler(
      new GetConsultationFeedbackForSessionUseCase(new FakeConsultationFeedbackRepository(feedback)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(doctorProfile)),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(patientProfile)),
      new GetAccountByIdUseCase(new FakeAccountRepository([doctorAccount, patientAccount])),
      notificationRepo,
      logger as never,
    );

    await handler.handle({
      consultationFeedbackId: feedback.getId(),
      doctorId: doctorProfile.getId(),
      consultationSessionId: feedback.getConsultationSessionId(),
    });

    assert.equal(notificationRepo.saved.length, 1);
    const notification = notificationRepo.saved[0];
    assert.equal(notification.getAccountId(), doctorAccount.getId().toString());
    assert.match(notification.getDescription(), /Amina Youssef/);
    assert.match(notification.getDescription(), /5\/5/);
    assert.match(notification.getDescription(), /Excellent care\./);
    assert.equal(notification.getActionUrl(), '/doctor/profile');
    assert.equal(logger.errors.length, 0);
  });

  it('is a silent no-op when no feedback exists for the session (never throws)', async () => {
    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyDoctorOfConsultationFeedbackSubmittedHandler(
      new GetConsultationFeedbackForSessionUseCase(new FakeConsultationFeedbackRepository(null)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(null)),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(null)),
      new GetAccountByIdUseCase(new FakeAccountRepository([])),
      notificationRepo,
      logger as never,
    );

    await handler.handle({
      consultationFeedbackId: '99999999-9999-4999-8999-999999999999',
      doctorId: '88888888-8888-4888-8888-888888888888',
      consultationSessionId: '77777777-7777-4777-8777-777777777777',
    });

    assert.equal(notificationRepo.saved.length, 0);
    assert.equal(logger.errors.length, 0);
  });
});
