import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationPricing } from '../../../consultation/domain/value-objects/consultation-pricing.value-object.js';
import { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { AppointmentRepository } from '../../../consultation/domain/repositories/appointment.repository.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import type { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

import { NotifyPatientOfAppointmentCancelledHandler } from './notify-patient-of-appointment-cancelled.handler.js';

class FakeAppointmentRepository implements AppointmentRepository {
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

describe('NotifyPatientOfAppointmentCancelledHandler', () => {
  it('notifies the patient when the doctor cancels, mentioning the automatic refund', async () => {
    const patient = PatientProfile.create({ accountId: '55555555-5555-4555-8555-555555555555' });
    const appointment = buildAppointment(patient.getId());

    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyPatientOfAppointmentCancelledHandler(
      new GetAppointmentByIdUseCase(new FakeAppointmentRepository(appointment)),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(patient)),
      notificationRepo,
      logger as never,
    );

    await handler.handle({ appointmentId: appointment.getId(), cancelledBy: 'doctor' });

    assert.equal(notificationRepo.saved.length, 1);
    const notification = notificationRepo.saved[0];
    assert.equal(notification.getAccountId(), patient.getAccountId());
    assert.equal(notification.getTitle(), 'Appointment cancelled');
    assert.match(notification.getDescription(), /refunded automatically/);
    assert.equal(notification.getActionUrl(), '/patient/appointments');
    assert.equal(logger.errors.length, 0);
  });

  it('notifies the patient when the patient themselves cancels, also mentioning the automatic refund', async () => {
    const patient = PatientProfile.create({ accountId: '55555555-5555-4555-8555-555555555555' });
    const appointment = buildAppointment(patient.getId());

    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyPatientOfAppointmentCancelledHandler(
      new GetAppointmentByIdUseCase(new FakeAppointmentRepository(appointment)),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(patient)),
      notificationRepo,
      logger as never,
    );

    await handler.handle({ appointmentId: appointment.getId(), cancelledBy: 'patient' });

    assert.equal(notificationRepo.saved.length, 1);
    assert.match(notificationRepo.saved[0].getDescription(), /refunded automatically/);
  });

  it('is a silent no-op for an unknown appointment id (never throws)', async () => {
    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyPatientOfAppointmentCancelledHandler(
      new GetAppointmentByIdUseCase(new FakeAppointmentRepository(null)),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(null)),
      notificationRepo,
      logger as never,
    );

    await handler.handle({ appointmentId: '99999999-9999-4999-8999-999999999999', cancelledBy: 'doctor' });

    assert.equal(notificationRepo.saved.length, 0);
    assert.equal(logger.errors.length, 0);
  });
});
