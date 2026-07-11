import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../../../shared/domain/tokens.js';
import { ConfirmAvailabilityWindowUseCase } from '../../../doctor/application/use-cases/confirm-availability-window/confirm-availability-window.use-case.js';
import { GetAvailabilityWindowByIdUseCase } from '../../../doctor/application/use-cases/get-availability-window-by-id/get-availability-window-by-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { ReleaseAvailabilityWindowUseCase } from '../../../doctor/application/use-cases/release-availability-window/release-availability-window.use-case.js';
import { ReserveAvailabilityWindowUseCase } from '../../../doctor/application/use-cases/reserve-availability-window/reserve-availability-window.use-case.js';
import { AvailabilityWindow } from '../../../doctor/domain/entities/availability-window.entity.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import { ConsultationType as DoctorConsultationType } from '../../../doctor/domain/enums/consultation-type.enum.js';
import type { AvailabilityWindowRepository } from '../../../doctor/domain/repositories/availability-window.repository.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import { ConfirmSlotUseCase } from '../../../scheduling/application/use-cases/confirm-slot/confirm-slot.use-case.js';
import { ReleaseSlotUseCase } from '../../../scheduling/application/use-cases/release-slot/release-slot.use-case.js';
import { ReserveSlotUseCase } from '../../../scheduling/application/use-cases/reserve-slot/reserve-slot.use-case.js';
import { APPOINTMENT_REPOSITORY, CONSULTATION_SESSION_REPOSITORY } from '../../application/ports/tokens.js';
import { BookAppointmentUseCase } from '../../application/use-cases/book-appointment/book-appointment.use-case.js';
import { CloseConsultationUseCase } from '../../application/use-cases/close-consultation/close-consultation.use-case.js';
import { ConfirmAppointmentUseCase } from '../../application/use-cases/confirm-appointment/confirm-appointment.use-case.js';
import { RescheduleOrCancelAppointmentUseCase } from '../../application/use-cases/reschedule-or-cancel-appointment/reschedule-or-cancel-appointment.use-case.js';
import { StartConsultationUseCase } from '../../application/use-cases/start-consultation/start-consultation.use-case.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';
import type { ConsultationSession } from '../../domain/entities/consultation-session.entity.js';
import type { AppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../domain/repositories/consultation-session.repository.js';

import { AppointmentController } from './appointment.controller.js';
import { ConsultationController } from './consultation.controller.js';

class InMemoryPatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profile: PatientProfile) {}
  async findById(id: string): Promise<PatientProfile | null> {
    return this.profile.getId() === id ? this.profile : null;
  }
  async findByAccountId(): Promise<PatientProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class InMemoryDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile) {}
  async findById(id: string): Promise<DoctorProfile | null> {
    return this.profile.getId() === id ? this.profile : null;
  }
  async findByAccountId(): Promise<DoctorProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class InMemoryAvailabilityWindowRepository implements AvailabilityWindowRepository {
  private readonly byId = new Map<string, AvailabilityWindow>();
  seed(window: AvailabilityWindow): void {
    this.byId.set(window.getId(), window);
  }
  async findById(id: string): Promise<AvailabilityWindow | null> {
    return this.byId.get(id) ?? null;
  }
  async findOverlapping(): Promise<AvailabilityWindow[]> {
    return [];
  }
  async save(window: AvailabilityWindow): Promise<void> {
    this.byId.set(window.getId(), window);
  }
}

class InMemoryAppointmentRepository implements AppointmentRepository {
  private readonly byId = new Map<string, Appointment>();
  async findById(id: string): Promise<Appointment | null> {
    return this.byId.get(id) ?? null;
  }
  async save(appointment: Appointment): Promise<void> {
    this.byId.set(appointment.getId(), appointment);
  }
}

class InMemoryConsultationSessionRepository implements ConsultationSessionRepository {
  private readonly byId = new Map<string, ConsultationSession>();
  async findById(id: string): Promise<ConsultationSession | null> {
    return this.byId.get(id) ?? null;
  }
  async findByAppointmentId(appointmentId: string): Promise<ConsultationSession | null> {
    for (const session of this.byId.values()) {
      if (session.getAppointmentId() === appointmentId) {
        return session;
      }
    }
    return null;
  }
  async save(session: ConsultationSession): Promise<void> {
    this.byId.set(session.getId(), session);
  }
}

class NoopDomainEventDispatcher {
  async dispatch(): Promise<void> {
    // intentionally empty
  }

  subscribe(): void {}
}

describe('Consultation controllers (integration)', () => {
  let app: INestApplication;
  let patient: PatientProfile;
  let doctor: DoctorProfile;
  let freeWindow: AvailabilityWindow;
  let secondFreeWindow: AvailabilityWindow;
  let sessionRepo: InMemoryConsultationSessionRepository;
  let bookedAppointmentId: string;

  before(async () => {
    patient = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    doctor = DoctorProfile.register({
      accountId: '22222222-2222-4222-8222-222222222222',
      licenseNumber: 'LIC-1',
      specialty: 'Cardiology',
    });

    const windowStart = new Date(Date.now() + 60 * 60_000);
    freeWindow = AvailabilityWindow.define({
      doctorId: doctor.getId(),
      startTime: windowStart,
      endTime: new Date(windowStart.getTime() + 30 * 60_000),
      consultationType: DoctorConsultationType.Free,
    });
    secondFreeWindow = AvailabilityWindow.define({
      doctorId: doctor.getId(),
      startTime: new Date(windowStart.getTime() + 60 * 60_000),
      endTime: new Date(windowStart.getTime() + 90 * 60_000),
      consultationType: DoctorConsultationType.Free,
    });

    const availabilityWindowRepo = new InMemoryAvailabilityWindowRepository();
    availabilityWindowRepo.seed(freeWindow);
    availabilityWindowRepo.seed(secondFreeWindow);

    const appointmentRepo = new InMemoryAppointmentRepository();
    sessionRepo = new InMemoryConsultationSessionRepository();

    const reserveSlotUseCase = new ReserveSlotUseCase(
      new ReserveAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDomainEventDispatcher()),
    );
    const releaseSlotUseCase = new ReleaseSlotUseCase(
      new ReleaseAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDomainEventDispatcher()),
    );
    const confirmSlotUseCase = new ConfirmSlotUseCase(
      new ConfirmAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDomainEventDispatcher()),
    );
    const confirmAppointmentUseCase = new ConfirmAppointmentUseCase(
      appointmentRepo,
      sessionRepo,
      confirmSlotUseCase,
      new NoopDomainEventDispatcher(),
    );
    const bookAppointmentUseCase = new BookAppointmentUseCase(
      appointmentRepo,
      new NoopDomainEventDispatcher(),
      new GetPatientProfileByIdUseCase(new InMemoryPatientProfileRepository(patient)),
      new GetDoctorProfileByIdUseCase(new InMemoryDoctorProfileRepository(doctor)),
      new GetAvailabilityWindowByIdUseCase(availabilityWindowRepo),
      reserveSlotUseCase,
      confirmAppointmentUseCase,
    );
    const rescheduleOrCancelAppointmentUseCase = new RescheduleOrCancelAppointmentUseCase(
      appointmentRepo,
      new NoopDomainEventDispatcher(),
      new GetAvailabilityWindowByIdUseCase(availabilityWindowRepo),
      reserveSlotUseCase,
      releaseSlotUseCase,
      confirmAppointmentUseCase,
    );
    const startConsultationUseCase = new StartConsultationUseCase(sessionRepo, new NoopDomainEventDispatcher());
    const closeConsultationUseCase = new CloseConsultationUseCase(
      sessionRepo,
      appointmentRepo,
      new NoopDomainEventDispatcher(),
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [AppointmentController, ConsultationController],
      providers: [
        PinoLoggerService,
        { provide: APPOINTMENT_REPOSITORY, useValue: appointmentRepo },
        { provide: CONSULTATION_SESSION_REPOSITORY, useValue: sessionRepo },
        { provide: DOMAIN_EVENT_DISPATCHER, useClass: NoopDomainEventDispatcher },
        { provide: BookAppointmentUseCase, useValue: bookAppointmentUseCase },
        { provide: RescheduleOrCancelAppointmentUseCase, useValue: rescheduleOrCancelAppointmentUseCase },
        { provide: StartConsultationUseCase, useValue: startConsultationUseCase },
        { provide: CloseConsultationUseCase, useValue: closeConsultationUseCase },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: createValidationException,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter(moduleRef.get(PinoLoggerService)));
    await app.init();
  });

  after(async () => {
    await app.close();
  });

  it('POST /appointments books and immediately confirms a free appointment', async () => {
    const response = await request(app.getHttpServer())
      .post('/appointments')
      .send({
        patientId: patient.getId(),
        doctorId: doctor.getId(),
        availabilityWindowId: freeWindow.getId(),
        consultationType: 'free',
        reasonForVisit: 'Routine check-up',
      })
      .expect(201);

    assert.equal(response.body.data.status, 'confirmed');
    bookedAppointmentId = response.body.data.id;
  });

  it('POST /appointments rejects an unknown patient with 404', async () => {
    const response = await request(app.getHttpServer())
      .post('/appointments')
      .send({
        patientId: '99999999-9999-4999-8999-999999999999',
        doctorId: doctor.getId(),
        availabilityWindowId: secondFreeWindow.getId(),
        consultationType: 'free',
      })
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('POST /appointments rejects a mismatched consultationType with 422', async () => {
    const response = await request(app.getHttpServer())
      .post('/appointments')
      .send({
        patientId: patient.getId(),
        doctorId: doctor.getId(),
        availabilityWindowId: secondFreeWindow.getId(),
        consultationType: 'paid',
      })
      .expect(422);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it('POST /appointments rejects rebooking an already-held/booked window with 409', async () => {
    const response = await request(app.getHttpServer())
      .post('/appointments')
      .send({
        patientId: patient.getId(),
        doctorId: doctor.getId(),
        availabilityWindowId: freeWindow.getId(),
        consultationType: 'free',
      })
      .expect(409);

    assert.equal(response.body.error.code, 'CONFLICT');
  });

  it('POST /consultations/:id/start and /close drive the session through its lifecycle', async () => {
    const session = await sessionRepo.findByAppointmentId(bookedAppointmentId);
    assert.ok(session);
    const sessionId = session.getId();

    const startResponse = await request(app.getHttpServer()).post(`/consultations/${sessionId}/start`).expect(200);
    assert.equal(startResponse.body.data.state, 'in_progress');

    const closeResponse = await request(app.getHttpServer())
      .post(`/consultations/${sessionId}/close`)
      .send({ completionReason: 'completed' })
      .expect(200);
    assert.equal(closeResponse.body.data.state, 'closed');
  });

  it('POST /consultations/:id/start returns 404 for an unknown id', async () => {
    const response = await request(app.getHttpServer())
      .post('/consultations/99999999-9999-4999-8999-999999999999/start')
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('PATCH /appointments/:id rejects cancelling an already-terminal (Completed) appointment', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/appointments/${bookedAppointmentId}`)
      .send({ action: 'cancel' })
      .expect(422);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it('PATCH /appointments/:id cancels a Confirmed appointment on the second window', async () => {
    const booked = await request(app.getHttpServer())
      .post('/appointments')
      .send({
        patientId: patient.getId(),
        doctorId: doctor.getId(),
        availabilityWindowId: secondFreeWindow.getId(),
        consultationType: 'free',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/appointments/${booked.body.data.id}`)
      .send({ action: 'cancel' })
      .expect(200);

    assert.equal(response.body.data.status, 'cancelled');
  });
});
