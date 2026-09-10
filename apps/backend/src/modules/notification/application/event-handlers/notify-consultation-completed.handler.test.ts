import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../../consultation/domain/entities/consultation-session.entity.js';
import { ConsultationPricing } from '../../../consultation/domain/value-objects/consultation-pricing.value-object.js';
import { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { AppointmentRepository } from '../../../consultation/domain/repositories/appointment.repository.js';
import { GetConsultationSessionByIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import type { ConsultationSessionRepository } from '../../../consultation/domain/repositories/consultation-session.repository.js';
import { GetFollowUpRecommendationForSessionUseCase } from '../../../consultation/application/use-cases/get-follow-up-recommendation-for-session/get-follow-up-recommendation-for-session.use-case.js';
import type { FollowUpRecommendationRepository } from '../../../consultation/domain/repositories/follow-up-recommendation.repository.js';
import type { FollowUpRecommendation } from '../../../consultation/domain/entities/follow-up-recommendation.entity.js';
import { ListPrescriptionsForConsultationSessionUseCase } from '../../../clinical/application/use-cases/list-prescriptions-for-consultation-session/list-prescriptions-for-consultation-session.use-case.js';
import type { PrescriptionRepository } from '../../../clinical/domain/repositories/prescription.repository.js';
import type { Prescription } from '../../../clinical/domain/entities/prescription.entity.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import { Account } from '../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { AccountRepository, ListAccountsResult } from '../../../identity/domain/repositories/account.repository.js';
import type { AccountId } from '../../../identity/domain/value-objects/account-id.value-object.js';
import { DisplayName } from '../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../identity/domain/value-objects/email-address.value-object.js';
import type { EmailSenderPort } from '../../../authentication/application/ports/email-sender.port.js';
import type { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

import { NotifyConsultationCompletedHandler } from './notify-consultation-completed.handler.js';

class FakeAppointmentRepository implements AppointmentRepository {
  async findConfirmedPastJoinWindowMissed(): Promise<Appointment[]> {
    return [];
  }
  async countFreeConsultationsForPatientSince(): Promise<number> {
    return 0;
  }
  async countNoShowsForPatient(): Promise<number> {
    return 0;
  }
  constructor(private readonly appointment: Appointment | null) {}
  async findById(id: string): Promise<Appointment | null> {
    return this.appointment && this.appointment.getId() === id ? this.appointment : null;
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
  async save(): Promise<void> {}
}

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  constructor(private readonly session: ConsultationSession | null) {}
  async findById(id: string): Promise<ConsultationSession | null> {
    return this.session && this.session.getId() === id ? this.session : null;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return this.session;
  }
  async findStale(): Promise<ConsultationSession[]> {
    return [];
  }
  async save(): Promise<void> {}
}

class FakeFollowUpRecommendationRepository implements FollowUpRecommendationRepository {
  constructor(private readonly recommendation: FollowUpRecommendation | null = null) {}
  async findByConsultationSessionId(): Promise<FollowUpRecommendation | null> {
    return this.recommendation;
  }
  async save(): Promise<void> {}
}

class FakePrescriptionRepository implements PrescriptionRepository {
  async findByVerificationCode(): Promise<Prescription | null> {
    return null;
  }
  constructor(private readonly prescriptions: Prescription[] = []) {}
  async findById(): Promise<Prescription | null> {
    return null;
  }
  async findByConsultationSessionId(): Promise<Prescription[]> {
    return this.prescriptions;
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

class FakeEmailSender implements EmailSenderPort {
  public sent: { to: string; template: string; data: Record<string, unknown> }[] = [];
  async send(to: string, template: string, data: Record<string, unknown>): Promise<void> {
    this.sent.push({ to, template, data });
  }
}

function buildAccount(): Account {
  return Account.register({
    email: EmailAddress.create(`patient-${Math.random()}@orivex.dev`),
    role: AccountRole.Patient,
    displayName: DisplayName.create('Test Patient'),
  });
}

class FakeLogger {
  public errors: unknown[] = [];
  error(message: unknown, ...rest: unknown[]): void {
    this.errors.push({ message, rest });
  }
}

function buildCompletedSession(): { appointment: Appointment; session: ConsultationSession } {
  const appointment = Appointment.request({
    patientId: '55555555-5555-4555-8555-555555555555',
    doctorId: '33333333-3333-4333-8333-333333333333',
    availabilityWindowId: '44444444-4444-4444-8444-444444444444',
    pricing: ConsultationPricing.free(),
    scheduledAt: new Date(Date.now() + 24 * 60 * 60_000),
  });
  const session = ConsultationSession.open(appointment.getId());
  return { appointment, session };
}

function buildHandler(props: {
  session: ConsultationSession | null;
  appointment: Appointment | null;
  patient: PatientProfile | null;
  account?: Account | null;
  prescriptions?: Prescription[];
  followUp?: FollowUpRecommendation | null;
  notificationRepo?: FakeNotificationRepository;
  emailSender?: FakeEmailSender;
  logger?: FakeLogger;
}): {
  handler: NotifyConsultationCompletedHandler;
  notificationRepo: FakeNotificationRepository;
  emailSender: FakeEmailSender;
  logger: FakeLogger;
} {
  const notificationRepo = props.notificationRepo ?? new FakeNotificationRepository();
  const emailSender = props.emailSender ?? new FakeEmailSender();
  const logger = props.logger ?? new FakeLogger();
  const accounts = props.account ? [props.account] : [];
  const handler = new NotifyConsultationCompletedHandler(
    new GetConsultationSessionByIdUseCase(new FakeConsultationSessionRepository(props.session)),
    new GetAppointmentByIdUseCase(new FakeAppointmentRepository(props.appointment)),
    new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(props.patient)),
    new ListPrescriptionsForConsultationSessionUseCase(new FakePrescriptionRepository(props.prescriptions)),
    new GetFollowUpRecommendationForSessionUseCase(new FakeFollowUpRecommendationRepository(props.followUp)),
    new GetAccountByIdUseCase(new FakeAccountRepository(accounts)),
    notificationRepo,
    emailSender,
    logger as never,
  );
  return { handler, notificationRepo, emailSender, logger };
}

describe('NotifyConsultationCompletedHandler', () => {
  it("notifies the patient's own account with a deep link to this consultation's summary dialog, where they can rate the visit", async () => {
    const { appointment, session } = buildCompletedSession();
    const account = buildAccount();
    const patient = PatientProfile.reconstitute({
      id: appointment.getPatientId(),
      accountId: account.getId().toString(),
      emergencyContacts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { handler, notificationRepo, emailSender, logger } = buildHandler({ session, appointment, patient, account });

    await handler.handle({ consultationSessionId: session.getId() });

    assert.equal(notificationRepo.saved.length, 1);
    const notification = notificationRepo.saved[0];
    assert.equal(notification.getAccountId(), patient.getAccountId());
    assert.equal(notification.getTitle(), 'Consultation completed');
    assert.equal(notification.getActionUrl(), `/patient/appointments?consultationSessionId=${session.getId()}`);
    assert.equal(logger.errors.length, 0);

    // I3 -- Notification delivery channels: the PRD's "review requests"
    // email type, PHI-light (no prescription/follow-up mention).
    assert.equal(emailSender.sent.length, 1);
    assert.equal(emailSender.sent[0]!.to, account.getEmail().toString());
    assert.equal(emailSender.sent[0]!.template, 'consultation-completed');
  });

  it('is a silent no-op for an unknown session id (never throws)', async () => {
    const { handler, notificationRepo, emailSender, logger } = buildHandler({ session: null, appointment: null, patient: null });

    await handler.handle({ consultationSessionId: '99999999-9999-4999-8999-999999999999' });

    assert.equal(notificationRepo.saved.length, 0);
    assert.equal(emailSender.sent.length, 0);
    assert.equal(logger.errors.length, 0);
  });
});
