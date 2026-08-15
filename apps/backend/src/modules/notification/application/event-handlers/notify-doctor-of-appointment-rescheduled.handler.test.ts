import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationPricing } from '../../../consultation/domain/value-objects/consultation-pricing.value-object.js';
import { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { AppointmentRepository } from '../../../consultation/domain/repositories/appointment.repository.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import type { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

import { NotifyDoctorOfAppointmentRescheduledHandler } from './notify-doctor-of-appointment-rescheduled.handler.js';

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

function buildNewAppointmentAndDoctor() {
  const doctorProfile = DoctorProfile.register({
    accountId: '11111111-1111-4111-8111-111111111111',
    licenseNumber: 'LIC-1',
    specialtyId: '22222222-2222-4222-8222-222222222222',
  });
  const newAppointment = Appointment.request({
    patientId: '33333333-3333-4333-8333-333333333333',
    doctorId: doctorProfile.getId(),
    availabilityWindowId: '44444444-4444-4444-8444-444444444444',
    pricing: ConsultationPricing.free(),
    scheduledAt: new Date(Date.now() + 24 * 60 * 60_000),
  });
  return { doctorProfile, newAppointment };
}

describe('NotifyDoctorOfAppointmentRescheduledHandler', () => {
  it('notifies the doctor when the patient reschedules', async () => {
    const { doctorProfile, newAppointment } = buildNewAppointmentAndDoctor();
    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyDoctorOfAppointmentRescheduledHandler(
      new GetAppointmentByIdUseCase(new FakeAppointmentRepository(newAppointment)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(doctorProfile)),
      notificationRepo,
      logger as never,
    );

    await handler.handle({
      oldAppointmentId: '55555555-5555-4555-8555-555555555555',
      newAppointmentId: newAppointment.getId(),
      rescheduledByRole: 'patient',
    });

    assert.equal(notificationRepo.saved.length, 1);
    assert.equal(notificationRepo.saved[0].getAccountId(), doctorProfile.getAccountId());
    assert.equal(logger.errors.length, 0);
  });

  it('never self-notifies the doctor when the doctor reschedules their own patient', async () => {
    const { doctorProfile, newAppointment } = buildNewAppointmentAndDoctor();
    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyDoctorOfAppointmentRescheduledHandler(
      new GetAppointmentByIdUseCase(new FakeAppointmentRepository(newAppointment)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(doctorProfile)),
      notificationRepo,
      logger as never,
    );

    await handler.handle({
      oldAppointmentId: '55555555-5555-4555-8555-555555555555',
      newAppointmentId: newAppointment.getId(),
      rescheduledByRole: 'doctor',
    });

    assert.equal(notificationRepo.saved.length, 0);
  });

  it('is a silent no-op for an unknown new appointment id (never throws)', async () => {
    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyDoctorOfAppointmentRescheduledHandler(
      new GetAppointmentByIdUseCase(new FakeAppointmentRepository(null)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(null)),
      notificationRepo,
      logger as never,
    );

    await handler.handle({
      oldAppointmentId: '55555555-5555-4555-8555-555555555555',
      newAppointmentId: '99999999-9999-4999-8999-999999999999',
      rescheduledByRole: 'patient',
    });

    assert.equal(notificationRepo.saved.length, 0);
    assert.equal(logger.errors.length, 0);
  });
});
