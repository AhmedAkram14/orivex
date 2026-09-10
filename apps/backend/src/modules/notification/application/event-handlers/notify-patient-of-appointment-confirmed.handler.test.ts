import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationPricing } from '../../../consultation/domain/value-objects/consultation-pricing.value-object.js';
import { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { AppointmentRepository } from '../../../consultation/domain/repositories/appointment.repository.js';
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

import { NotifyPatientOfAppointmentConfirmedHandler } from './notify-patient-of-appointment-confirmed.handler.js';

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

function buildAccount(role: AccountRole, displayName: string): Account {
  return Account.register({
    email: EmailAddress.create(`${role}-${Math.random()}@orivex.dev`),
    role,
    displayName: DisplayName.create(displayName),
  });
}

class FakeLogger {
  public errors: unknown[] = [];
  error(message: unknown, ...rest: unknown[]): void {
    this.errors.push({ message, rest });
  }
}

function buildAppointment(patientId: string): Appointment {
  return Appointment.request({
    patientId,
    doctorId: '33333333-3333-4333-8333-333333333333',
    availabilityWindowId: '44444444-4444-4444-8444-444444444444',
    pricing: ConsultationPricing.free(),
    scheduledAt: new Date(Date.now() + 24 * 60 * 60_000),
  });
}

describe('NotifyPatientOfAppointmentConfirmedHandler', () => {
  it("notifies the patient's own account with a link to their appointments, and emails them", async () => {
    const patientAccount = buildAccount(AccountRole.Patient, 'Amina Youssef');
    const patient = PatientProfile.create({ accountId: patientAccount.getId().toString() });
    const appointment = buildAppointment(patient.getId());

    const notificationRepo = new FakeNotificationRepository();
    const emailSender = new FakeEmailSender();
    const logger = new FakeLogger();
    const handler = new NotifyPatientOfAppointmentConfirmedHandler(
      new GetAppointmentByIdUseCase(new FakeAppointmentRepository(appointment)),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(patient)),
      new GetAccountByIdUseCase(new FakeAccountRepository([patientAccount])),
      notificationRepo,
      emailSender,
      logger as never,
    );

    await handler.handle({ appointmentId: appointment.getId() });

    assert.equal(notificationRepo.saved.length, 1);
    const notification = notificationRepo.saved[0];
    assert.equal(notification.getAccountId(), patient.getAccountId());
    assert.equal(notification.getTitle(), 'Appointment approved');
    assert.equal(notification.getActionUrl(), '/patient/appointments');
    assert.equal(logger.errors.length, 0);

    assert.equal(emailSender.sent.length, 1);
    assert.equal(emailSender.sent[0]!.to, patientAccount.getEmail().toString());
    assert.equal(emailSender.sent[0]!.template, 'appointment-confirmed');
  });

  it('is a silent no-op for an unknown appointment id (never throws)', async () => {
    const notificationRepo = new FakeNotificationRepository();
    const emailSender = new FakeEmailSender();
    const logger = new FakeLogger();
    const handler = new NotifyPatientOfAppointmentConfirmedHandler(
      new GetAppointmentByIdUseCase(new FakeAppointmentRepository(null)),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(null)),
      new GetAccountByIdUseCase(new FakeAccountRepository([])),
      notificationRepo,
      emailSender,
      logger as never,
    );

    await handler.handle({ appointmentId: '99999999-9999-4999-8999-999999999999' });

    assert.equal(notificationRepo.saved.length, 0);
    assert.equal(emailSender.sent.length, 0);
    assert.equal(logger.errors.length, 0);
  });
});
