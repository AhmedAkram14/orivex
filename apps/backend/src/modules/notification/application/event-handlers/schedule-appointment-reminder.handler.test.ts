import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationType } from '../../../consultation/domain/enums/consultation-type.enum.js';
import { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { AppointmentRepository } from '../../../consultation/domain/repositories/appointment.repository.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import type { EnqueueAppointmentReminderJob, NotificationQueuePort } from '../ports/notification-queue.port.js';

import { ScheduleAppointmentReminderHandler } from './schedule-appointment-reminder.handler.js';

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

class FakeNotificationQueue implements NotificationQueuePort {
  public lastJob: EnqueueAppointmentReminderJob | undefined;
  constructor(private readonly shouldThrow = false) {}
  async enqueueAppointmentReminder(job: EnqueueAppointmentReminderJob): Promise<void> {
    if (this.shouldThrow) {
      throw new Error('queue not configured');
    }
    this.lastJob = job;
  }
  async checkConnectivity(): Promise<void> {}
}

class FakeLogger {
  public errors: unknown[] = [];
  error(message: unknown, ...rest: unknown[]): void {
    this.errors.push({ message, rest });
  }
}

function buildAppointment(scheduledAt: Date, patientId = '22222222-2222-4222-8222-222222222222'): Appointment {
  return Appointment.request({
    patientId,
    doctorId: '33333333-3333-4333-8333-333333333333',
    availabilityWindowId: '44444444-4444-4444-8444-444444444444',
    consultationType: ConsultationType.Free,
    scheduledAt,
  });
}

describe('ScheduleAppointmentReminderHandler', () => {
  it('enqueues a reminder 24h before a far-future appointment', async () => {
    const patient = PatientProfile.create({ accountId: '55555555-5555-4555-8555-555555555555' });
    const patientAtSameId = buildAppointment(new Date(Date.now() + 72 * 60 * 60_000), patient.getId());

    const appointmentRepo = new FakeAppointmentRepository(patientAtSameId);
    const patientRepo = new FakePatientProfileRepository(patient);
    const queue = new FakeNotificationQueue();
    const logger = new FakeLogger();

    const handler = new ScheduleAppointmentReminderHandler(
      new GetAppointmentByIdUseCase(appointmentRepo),
      new GetPatientProfileByIdUseCase(patientRepo),
      queue,
      logger as never,
    );

    await handler.handle({ appointmentId: patientAtSameId.getId() });

    assert.ok(queue.lastJob);
    assert.equal(queue.lastJob?.accountId, patient.getAccountId());
    assert.equal(queue.lastJob?.appointmentId, patientAtSameId.getId());
    // ~48h delay (72h until the appointment, minus the 24h reminder lead time).
    assert.ok(queue.lastJob!.delayMs > 47 * 60 * 60_000 && queue.lastJob!.delayMs <= 48 * 60 * 60_000);
    assert.equal(logger.errors.length, 0);
  });

  it('never schedules a reminder for an appointment booked less than 24h out', async () => {
    const patient = PatientProfile.create({ accountId: '55555555-5555-4555-8555-555555555555' });
    const appointment = buildAppointment(new Date(Date.now() + 2 * 60 * 60_000), patient.getId());

    const appointmentRepo = new FakeAppointmentRepository(appointment);
    const patientRepo = new FakePatientProfileRepository(patient);
    const queue = new FakeNotificationQueue();
    const logger = new FakeLogger();

    const handler = new ScheduleAppointmentReminderHandler(
      new GetAppointmentByIdUseCase(appointmentRepo),
      new GetPatientProfileByIdUseCase(patientRepo),
      queue,
      logger as never,
    );

    await handler.handle({ appointmentId: appointment.getId() });

    assert.equal(queue.lastJob, undefined);
  });

  it('is a silent no-op for an unknown appointment id (never throws)', async () => {
    const appointmentRepo = new FakeAppointmentRepository(null);
    const patientRepo = new FakePatientProfileRepository(null);
    const queue = new FakeNotificationQueue();
    const logger = new FakeLogger();

    const handler = new ScheduleAppointmentReminderHandler(
      new GetAppointmentByIdUseCase(appointmentRepo),
      new GetPatientProfileByIdUseCase(patientRepo),
      queue,
      logger as never,
    );

    await handler.handle({ appointmentId: '99999999-9999-4999-8999-999999999999' });

    assert.equal(queue.lastJob, undefined);
  });

  it('logs (and never throws) when the queue is not configured, so booking is never broken by a missing queue', async () => {
    const patient = PatientProfile.create({ accountId: '55555555-5555-4555-8555-555555555555' });
    const appointment = buildAppointment(new Date(Date.now() + 72 * 60 * 60_000), patient.getId());

    const appointmentRepo = new FakeAppointmentRepository(appointment);
    const patientRepo = new FakePatientProfileRepository(patient);
    const queue = new FakeNotificationQueue(true);
    const logger = new FakeLogger();

    const handler = new ScheduleAppointmentReminderHandler(
      new GetAppointmentByIdUseCase(appointmentRepo),
      new GetPatientProfileByIdUseCase(patientRepo),
      queue,
      logger as never,
    );

    await handler.handle({ appointmentId: appointment.getId() });

    assert.equal(logger.errors.length, 1);
  });
});
