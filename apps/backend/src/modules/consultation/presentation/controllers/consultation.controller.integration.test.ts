import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { Reflector } from '@nestjs/core';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../../../shared/domain/tokens.js';
import type { AccessTokenClaims, JwtSignerPort } from '../../../authentication/application/ports/jwt-signer.port.js';
import { JWT_SIGNER } from '../../../authentication/application/ports/tokens.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
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
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { Account } from '../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../identity/domain/repositories/account.repository.js';
import type { AccountId } from '../../../identity/domain/value-objects/account-id.value-object.js';
import { DisplayName } from '../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../identity/domain/value-objects/email-address.value-object.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
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
import { ListAppointmentsForPatientUseCase } from '../../application/use-cases/list-appointments-for-patient/list-appointments-for-patient.use-case.js';
import { RescheduleOrCancelAppointmentUseCase } from '../../application/use-cases/reschedule-or-cancel-appointment/reschedule-or-cancel-appointment.use-case.js';
import { StartConsultationUseCase } from '../../application/use-cases/start-consultation/start-consultation.use-case.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';
import type { ConsultationSession } from '../../domain/entities/consultation-session.entity.js';
import type { AppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../domain/repositories/consultation-session.repository.js';

import { AppointmentController } from './appointment.controller.js';
import { ConsultationController } from './consultation.controller.js';

const VALID_PATIENT_TOKEN = 'valid-patient-token';

class InMemoryPatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profile: PatientProfile) {}
  async findById(id: string): Promise<PatientProfile | null> {
    return this.profile.getId() === id ? this.profile : null;
  }
  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    return this.profile.getAccountId() === accountId ? this.profile : null;
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

class InMemoryAccountRepository implements AccountRepository {
  constructor(private readonly accounts: Account[]) {}
  async findById(id: AccountId): Promise<Account | null> {
    return this.accounts.find((account) => account.getId().equals(id)) ?? null;
  }
  async findByEmail(): Promise<Account | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class FakeJwtSigner implements JwtSignerPort {
  constructor(private readonly accountId: string) {}
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    if (token !== VALID_PATIENT_TOKEN) {
      throw new Error('invalid token');
    }
    return { accountId: this.accountId, role: AccountRole.Patient };
  }
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
  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return Array.from(this.byId.values()).filter((appointment) => appointment.getPatientId() === patientId);
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
    const patientAccount = Account.register({
      email: EmailAddress.create('patient@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Amina Youssef'),
    });
    const doctorAccount = Account.register({
      email: EmailAddress.create('doctor@example.com'),
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Dr. Karim Adel'),
    });

    patient = PatientProfile.create({ accountId: patientAccount.getId().toString() });
    doctor = DoctorProfile.register({
      accountId: doctorAccount.getId().toString(),
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
      releaseSlotUseCase,
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

    const accountRepo = new InMemoryAccountRepository([patientAccount, doctorAccount]);
    const getAccountByIdUseCase = new GetAccountByIdUseCase(accountRepo);
    const getPatientProfileByAccountIdUseCase = new GetPatientProfileByAccountIdUseCase(
      new InMemoryPatientProfileRepository(patient),
    );
    const getDoctorProfileByIdUseCase = new GetDoctorProfileByIdUseCase(new InMemoryDoctorProfileRepository(doctor));
    const listAppointmentsForPatientUseCase = new ListAppointmentsForPatientUseCase(appointmentRepo);

    const moduleRef = await Test.createTestingModule({
      controllers: [AppointmentController, ConsultationController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        { provide: JWT_SIGNER, useFactory: () => new FakeJwtSigner(patientAccount.getId().toString()) },
        { provide: APPOINTMENT_REPOSITORY, useValue: appointmentRepo },
        { provide: CONSULTATION_SESSION_REPOSITORY, useValue: sessionRepo },
        { provide: DOMAIN_EVENT_DISPATCHER, useClass: NoopDomainEventDispatcher },
        { provide: BookAppointmentUseCase, useValue: bookAppointmentUseCase },
        { provide: RescheduleOrCancelAppointmentUseCase, useValue: rescheduleOrCancelAppointmentUseCase },
        { provide: StartConsultationUseCase, useValue: startConsultationUseCase },
        { provide: CloseConsultationUseCase, useValue: closeConsultationUseCase },
        { provide: GetAccountByIdUseCase, useValue: getAccountByIdUseCase },
        { provide: GetPatientProfileByAccountIdUseCase, useValue: getPatientProfileByAccountIdUseCase },
        { provide: GetDoctorProfileByIdUseCase, useValue: getDoctorProfileByIdUseCase },
        { provide: ListAppointmentsForPatientUseCase, useValue: listAppointmentsForPatientUseCase },
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

  it('GET /appointments/me rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/appointments/me').expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /appointments/me returns the caller\'s own appointments with doctor name/specialty composed in', async () => {
    const response = await request(app.getHttpServer())
      .get('/appointments/me')
      .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
      .expect(200);

    assert.ok(response.body.data.length >= 2);
    for (const item of response.body.data) {
      assert.equal(item.doctorName, 'Dr. Karim Adel');
      assert.equal(item.specialization, 'Cardiology');
      assert.ok(item.scheduledAt);
      assert.ok(['requested', 'confirmed', 'rescheduled', 'cancelled', 'no_show', 'completed'].includes(item.status));
    }
  });
});
