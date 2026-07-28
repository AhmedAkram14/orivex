import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../../consultation/domain/entities/consultation-session.entity.js';
import { ConsultationType } from '../../../consultation/domain/enums/consultation-type.enum.js';
import { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import type { AppointmentRepository } from '../../../consultation/domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../consultation/domain/repositories/consultation-session.repository.js';
import { Prescription } from '../../../clinical/domain/entities/prescription.entity.js';
import { GetPrescriptionByIdUseCase } from '../../../clinical/application/use-cases/get-prescription-by-id/get-prescription-by-id.use-case.js';
import type { PrescriptionRepository } from '../../../clinical/domain/repositories/prescription.repository.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import type { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

import { NotifyPatientOfPrescriptionSignedHandler } from './notify-patient-of-prescription-signed.handler.js';

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
  async save(): Promise<void> {}
}

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  constructor(private readonly session: ConsultationSession | null) {}
  async findById(id: string): Promise<ConsultationSession | null> {
    return this.session && this.session.getId() === id ? this.session : null;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class FakePrescriptionRepository implements PrescriptionRepository {
  constructor(private readonly prescription: Prescription | null) {}
  async findById(id: string): Promise<Prescription | null> {
    return this.prescription && this.prescription.getId() === id ? this.prescription : null;
  }
  async findByConsultationSessionId(): Promise<Prescription[]> {
    return [];
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

describe('NotifyPatientOfPrescriptionSignedHandler', () => {
  it("notifies the patient's own account when their doctor signs a prescription", async () => {
    const patient = PatientProfile.create({ accountId: '55555555-5555-4555-8555-555555555555' });
    const appointment = Appointment.request({
      patientId: patient.getId(),
      doctorId: '33333333-3333-4333-8333-333333333333',
      availabilityWindowId: '44444444-4444-4444-8444-444444444444',
      consultationType: ConsultationType.Free,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60_000),
    });
    const session = ConsultationSession.open(appointment.getId());
    const prescription = Prescription.sign({
      consultationSessionId: session.getId(),
      diagnosisNodeId: '66666666-6666-4666-8666-666666666666',
      authoringDoctorId: '33333333-3333-4333-8333-333333333333',
      lineItems: [{ drugCatalogId: '77777777-7777-4777-8777-777777777777', dosage: '500mg', frequency: 'Twice daily', durationDays: 7 }],
    });

    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyPatientOfPrescriptionSignedHandler(
      new GetPrescriptionByIdUseCase(new FakePrescriptionRepository(prescription)),
      new GetConsultationSessionByIdUseCase(new FakeConsultationSessionRepository(session)),
      new GetAppointmentByIdUseCase(new FakeAppointmentRepository(appointment)),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(patient)),
      notificationRepo,
      logger as never,
    );

    await handler.handle({ prescriptionId: prescription.getId() });

    assert.equal(notificationRepo.saved.length, 1);
    const notification = notificationRepo.saved[0];
    assert.equal(notification.getAccountId(), patient.getAccountId());
    assert.equal(notification.getTitle(), 'New prescription');
    assert.equal(notification.getActionUrl(), '/patient/prescriptions');
    assert.equal(logger.errors.length, 0);
  });

  it('is a silent no-op for an unknown prescription id (never throws)', async () => {
    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyPatientOfPrescriptionSignedHandler(
      new GetPrescriptionByIdUseCase(new FakePrescriptionRepository(null)),
      new GetConsultationSessionByIdUseCase(new FakeConsultationSessionRepository(null)),
      new GetAppointmentByIdUseCase(new FakeAppointmentRepository(null)),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(null)),
      notificationRepo,
      logger as never,
    );

    await handler.handle({ prescriptionId: '99999999-9999-4999-8999-999999999999' });

    assert.equal(notificationRepo.saved.length, 0);
    assert.equal(logger.errors.length, 0);
  });
});
