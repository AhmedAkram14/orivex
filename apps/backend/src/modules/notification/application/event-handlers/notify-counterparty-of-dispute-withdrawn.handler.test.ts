import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { Dispute } from '../../../consultation/domain/entities/dispute.entity.js';
import { DisputeCategory } from '../../../consultation/domain/enums/dispute-category.enum.js';
import { ConsultationPricing } from '../../../consultation/domain/value-objects/consultation-pricing.value-object.js';
import { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetDisputeByIdUseCase } from '../../../consultation/application/use-cases/get-dispute-by-id/get-dispute-by-id.use-case.js';
import type { AppointmentRepository } from '../../../consultation/domain/repositories/appointment.repository.js';
import type { DisputeRepository } from '../../../consultation/domain/repositories/dispute.repository.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { Account } from '../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { AccountRepository, ListAccountsResult } from '../../../identity/domain/repositories/account.repository.js';
import type { AccountId } from '../../../identity/domain/value-objects/account-id.value-object.js';
import { DisplayName } from '../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../identity/domain/value-objects/email-address.value-object.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import type { EmailSenderPort } from '../../../authentication/application/ports/email-sender.port.js';
import type { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

import { NotifyCounterpartyOfDisputeWithdrawnHandler } from './notify-counterparty-of-dispute-withdrawn.handler.js';

class FakeAppointmentRepository implements AppointmentRepository {
  constructor(private readonly appointment: Appointment | null) {}
  async findConfirmedPastJoinWindowMissed(): Promise<Appointment[]> {
    return [];
  }
  async findRequestedPastScheduledAt(): Promise<Appointment[]> {
    return [];
  }
  async countFreeConsultationsForPatientSince(): Promise<number> {
    return 0;
  }
  async countNoShowsForPatient(): Promise<number> {
    return 0;
  }
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
  async findByPatientAndDoctor(): Promise<Appointment | null> {
    return null;
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

class FakeDisputeRepository implements DisputeRepository {
  constructor(private readonly dispute: Dispute | null) {}
  async findById(id: string): Promise<Dispute | null> {
    return this.dispute && this.dispute.getId() === id ? this.dispute : null;
  }
  async findByAppointmentId(): Promise<Dispute | null> {
    return null;
  }
  async listForParty(): Promise<Dispute[]> {
    return [];
  }
  async listByStatus(): Promise<{ disputes: Dispute[]; total: number }> {
    return { disputes: [], total: 0 };
  }
  async save(): Promise<void> {}
  async update(): Promise<void> {}
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

class FakeEmailSender implements EmailSenderPort {
  public sent: { to: string; template: string; data: Record<string, unknown> }[] = [];
  async send(to: string, template: string, data: Record<string, unknown>): Promise<void> {
    this.sent.push({ to, template, data });
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

function buildScenario() {
  const patientAccount = buildAccount(AccountRole.Patient, 'Amina Youssef');
  const doctorAccount = buildAccount(AccountRole.Doctor, 'Dr. Karim Hassan');
  const patient = PatientProfile.create({ accountId: patientAccount.getId().toString() });
  const doctor = DoctorProfile.register({
    accountId: doctorAccount.getId().toString(),
    licenseNumber: 'LIC-1',
    specialtyId: '77777777-7777-4777-8777-777777777777',
  });
  const appointment = Appointment.request({
    patientId: patient.getId(),
    doctorId: doctor.getId(),
    availabilityWindowId: '44444444-4444-4444-8444-444444444444',
    pricing: ConsultationPricing.free(),
    scheduledAt: new Date(Date.now() + 24 * 60 * 60_000),
  });
  return { patientAccount, doctorAccount, patient, doctor, appointment };
}

function buildHandler(props: {
  dispute: Dispute | null;
  appointment: Appointment | null;
  patient: PatientProfile | null;
  doctor: DoctorProfile | null;
  accounts: Account[];
  notificationRepo: FakeNotificationRepository;
  emailSender: FakeEmailSender;
  logger: FakeLogger;
}): NotifyCounterpartyOfDisputeWithdrawnHandler {
  return new NotifyCounterpartyOfDisputeWithdrawnHandler(
    new GetDisputeByIdUseCase(new FakeDisputeRepository(props.dispute)),
    new GetAppointmentByIdUseCase(new FakeAppointmentRepository(props.appointment)),
    new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(props.patient)),
    new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(props.doctor)),
    new GetAccountByIdUseCase(new FakeAccountRepository(props.accounts)),
    props.notificationRepo,
    props.emailSender,
    props.logger as never,
  );
}

describe('NotifyCounterpartyOfDisputeWithdrawnHandler', () => {
  it('notifies only the counterparty, never the raiser who already knows', async () => {
    const { patientAccount, doctorAccount, patient, doctor, appointment } = buildScenario();
    const dispute = Dispute.raise({
      appointmentId: appointment.getId(),
      raisedByAccountId: patientAccount.getId().toString(),
      reason: 'Doctor never joined the call.',
      category: DisputeCategory.NoShow,
    });
    dispute.withdraw();

    const notificationRepo = new FakeNotificationRepository();
    const emailSender = new FakeEmailSender();
    const logger = new FakeLogger();
    const handler = buildHandler({
      dispute,
      appointment,
      patient,
      doctor,
      accounts: [patientAccount, doctorAccount],
      notificationRepo,
      emailSender,
      logger,
    });

    await handler.handle({ disputeId: dispute.getId() });

    assert.equal(notificationRepo.saved.length, 1);
    const notification = notificationRepo.saved[0]!;
    assert.equal(notification.getAccountId(), doctor.getAccountId());
    assert.notEqual(notification.getAccountId(), patient.getAccountId());
    assert.equal(notification.getTitle(), 'Dispute withdrawn');
    assert.equal(notification.getActionUrl(), '/doctor/disputes');

    assert.equal(emailSender.sent.length, 1);
    assert.equal(emailSender.sent[0]!.template, 'dispute-withdrawn');
    assert.equal(logger.errors.length, 0);
  });

  it('notifies the doctor-raiser case symmetrically -- only the patient counterparty', async () => {
    const { patientAccount, doctorAccount, patient, doctor, appointment } = buildScenario();
    const dispute = Dispute.raise({
      appointmentId: appointment.getId(),
      raisedByAccountId: doctorAccount.getId().toString(),
      reason: 'Patient was abusive.',
      category: DisputeCategory.Conduct,
    });
    dispute.withdraw();

    const notificationRepo = new FakeNotificationRepository();
    const emailSender = new FakeEmailSender();
    const logger = new FakeLogger();
    const handler = buildHandler({
      dispute,
      appointment,
      patient,
      doctor,
      accounts: [patientAccount, doctorAccount],
      notificationRepo,
      emailSender,
      logger,
    });

    await handler.handle({ disputeId: dispute.getId() });

    assert.equal(notificationRepo.saved.length, 1);
    assert.equal(notificationRepo.saved[0]!.getAccountId(), patient.getAccountId());
    assert.equal(notificationRepo.saved[0]!.getActionUrl(), '/patient/disputes');
  });

  it('is a silent no-op for an unknown dispute id (never throws)', async () => {
    const notificationRepo = new FakeNotificationRepository();
    const emailSender = new FakeEmailSender();
    const logger = new FakeLogger();
    const handler = buildHandler({
      dispute: null,
      appointment: null,
      patient: null,
      doctor: null,
      accounts: [],
      notificationRepo,
      emailSender,
      logger,
    });

    await handler.handle({ disputeId: '99999999-9999-4999-8999-999999999999' });

    assert.equal(notificationRepo.saved.length, 0);
    assert.equal(emailSender.sent.length, 0);
    assert.equal(logger.errors.length, 0);
  });
});
