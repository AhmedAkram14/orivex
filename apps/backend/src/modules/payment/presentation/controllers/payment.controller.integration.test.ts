import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

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
import { ConfirmAppointmentUseCase } from '../../../consultation/application/use-cases/confirm-appointment/confirm-appointment.use-case.js';
import { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../../consultation/domain/entities/consultation-session.entity.js';
import { ConsultationType } from '../../../consultation/domain/enums/consultation-type.enum.js';
import type { AppointmentRepository } from '../../../consultation/domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../consultation/domain/repositories/consultation-session.repository.js';
import { ConfirmAvailabilityWindowUseCase } from '../../../doctor/application/use-cases/confirm-availability-window/confirm-availability-window.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { AvailabilityWindow } from '../../../doctor/domain/entities/availability-window.entity.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import { ConsultationType as DoctorConsultationType } from '../../../doctor/domain/enums/consultation-type.enum.js';
import type { AvailabilityWindowRepository } from '../../../doctor/domain/repositories/availability-window.repository.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import { ConfirmSlotUseCase } from '../../../scheduling/application/use-cases/confirm-slot/confirm-slot.use-case.js';
import { InitiateChargeUseCase } from '../../application/use-cases/initiate-charge/initiate-charge.use-case.js';
import { GetPaymentTransactionByConsultationSessionIdUseCase } from '../../application/use-cases/get-payment-transaction-by-consultation-session-id/get-payment-transaction-by-consultation-session-id.use-case.js';
import { GetPaymentTransactionByIdUseCase } from '../../application/use-cases/get-payment-transaction-by-id/get-payment-transaction-by-id.use-case.js';
import { RefundPaymentUseCase } from '../../application/use-cases/refund-payment/refund-payment.use-case.js';
import type { PaymentGatewayPort } from '../../application/ports/payment-gateway.port.js';
import type { PaymentTransaction } from '../../domain/entities/payment-transaction.entity.js';
import type { PaymentTransactionRepository } from '../../domain/repositories/payment-transaction.repository.js';
import { CheckIdentityVerificationStatusUseCase } from '../../../trust/application/use-cases/check-identity-verification-status/check-identity-verification-status.use-case.js';
import type { IdentityVerificationStatusResult } from '../../../trust/application/use-cases/check-identity-verification-status/check-identity-verification-status.use-case.js';
import { VerificationStatus } from '../../../trust/domain/enums/verification-status.enum.js';
import { RequiresIdentityVerificationGuard } from '../../../trust/presentation/guards/requires-identity-verification.guard.js';

import { PaymentController } from './payment.controller.js';

const PATIENT_TOKEN = 'valid-patient-token';
const OTHER_PATIENT_TOKEN = 'valid-other-patient-token';
const DOCTOR_TOKEN = 'valid-doctor-token';
const OTHER_DOCTOR_TOKEN = 'valid-other-doctor-token';
const UNVERIFIED_PATIENT_TOKEN = 'valid-unverified-patient-token';

// Onboarding Redesign (2026-07-21 proposal, Stage O.4) test double --
// RequiresIdentityVerificationGuard's real dependency, faked here so the
// guard's own real class runs in this suite's TestingModule.
class FakeCheckIdentityVerificationStatusUseCase {
  constructor(private readonly verifiedAccountIds: Set<string>) {}
  async execute(query: { subjectAccountId: string }): Promise<IdentityVerificationStatusResult> {
    const isVerified = this.verifiedAccountIds.has(query.subjectAccountId);
    return { status: isVerified ? VerificationStatus.Approved : 'not_submitted', isVerified };
  }
}

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

class FakeJwtSigner implements JwtSignerPort {
  constructor(private readonly tokens: Map<string, AccessTokenClaims>) {}
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    const claims = this.tokens.get(token);
    if (!claims) {
      throw new Error('invalid token');
    }
    return claims;
  }
}

class InMemoryAppointmentRepository implements AppointmentRepository {
  constructor(private readonly appointment: Appointment) {}
  async findById(id: string): Promise<Appointment | null> {
    return this.appointment.getId() === id ? this.appointment : null;
  }
  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return this.appointment.getPatientId() === patientId ? [this.appointment] : [];
  }
  async findByPatientIdPage(patientId: string, skip: number, take: number): Promise<Appointment[]> {
    return (await this.findByPatientId(patientId)).slice(skip, skip + take);
  }
  async countByPatientId(patientId: string): Promise<number> {
    return (await this.findByPatientId(patientId)).length;
  }
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return this.appointment.getDoctorId() === doctorId ? [this.appointment] : [];
  }
  async findByDoctorIdForDateRange(doctorId: string): Promise<Appointment[]> {
    return this.findByDoctorId(doctorId);
  }
  async save(): Promise<void> {}
}

class InMemoryConsultationSessionRepository implements ConsultationSessionRepository {
  constructor(private readonly session: ConsultationSession) {}
  async findById(id: string): Promise<ConsultationSession | null> {
    return this.session.getId() === id ? this.session : null;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class InMemoryAvailabilityWindowRepository implements AvailabilityWindowRepository {
  constructor(private readonly window: AvailabilityWindow) {}
  async findById(): Promise<AvailabilityWindow | null> {
    return this.window;
  }
  async findOverlapping(): Promise<AvailabilityWindow[]> {
    return [];
  }
  async findByDoctorAndRange(): Promise<AvailabilityWindow[]> {
    return [];
  }
  async save(): Promise<void> {}
}

class InMemoryDoctorProfileRepository implements DoctorProfileRepository {
  private readonly profiles: DoctorProfile[];
  constructor(...profiles: DoctorProfile[]) {
    this.profiles = profiles;
  }
  async findById(id: string): Promise<DoctorProfile | null> {
    return this.profiles.find((p) => p.getId() === id) ?? null;
  }
  async findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    return this.profiles.find((p) => p.getAccountId() === accountId) ?? null;
  }
  async save(): Promise<void> {}
}

class InMemoryPaymentTransactionRepository implements PaymentTransactionRepository {
  private readonly byId = new Map<string, PaymentTransaction>();
  private readonly byIdempotencyKey = new Map<string, PaymentTransaction>();

  async findById(id: string): Promise<PaymentTransaction | null> {
    return this.byId.get(id) ?? null;
  }
  async findByIdempotencyKey(idempotencyKey: string): Promise<PaymentTransaction | null> {
    return this.byIdempotencyKey.get(idempotencyKey) ?? null;
  }
  async findByExternalReference(externalReference: string): Promise<PaymentTransaction | null> {
    return Array.from(this.byId.values()).find((t) => t.getExternalReference() === externalReference) ?? null;
  }
  async findByConsultationSessionId(consultationSessionId: string): Promise<PaymentTransaction | null> {
    return Array.from(this.byId.values()).find((t) => t.getConsultationSessionId() === consultationSessionId) ?? null;
  }
  async save(transaction: PaymentTransaction): Promise<void> {
    this.byId.set(transaction.getId(), transaction);
    this.byIdempotencyKey.set(transaction.getIdempotencyKey(), transaction);
  }
}

// Test-only fake gateway -- standard test-double practice, not a
// production adapter. PaymentModule itself registers no provider for
// PAYMENT_GATEWAY (architect direction).
class FakeGateway implements PaymentGatewayPort {
  private counter = 0;
  constructor(private readonly succeeds: boolean) {}
  async authorize(): Promise<{ succeeded: boolean; externalReference?: string }> {
    this.counter += 1;
    return this.succeeds ? { succeeded: true, externalReference: `pi_test_${this.counter}` } : { succeeded: false };
  }
  async refund(): Promise<{ succeeded: boolean }> {
    return { succeeded: true };
  }
}

class NoopDomainEventDispatcher {
  async dispatch(): Promise<void> {
    // intentionally empty
  }

  subscribe(): void {}
}

async function buildApp(gatewaySucceeds: boolean): Promise<{ app: INestApplication; sessionId: string }> {
  const window = AvailabilityWindow.define({
    doctorId: '33333333-3333-4333-8333-333333333333',
    startTime: new Date(Date.now() + 60 * 60_000),
    endTime: new Date(Date.now() + 90 * 60_000),
    consultationType: DoctorConsultationType.Paid,
  });
  window.hold();
  const patient = PatientProfile.reconstitute({
    id: '22222222-2222-4222-8222-222222222222',
    accountId: '77777777-7777-4777-8777-777777777777',
    emergencyContacts: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const otherPatient = PatientProfile.create({ accountId: '88888888-8888-4888-8888-888888888888' });
  const appointment = Appointment.request({
    patientId: patient.getId(),
    doctorId: '33333333-3333-4333-8333-333333333333',
    availabilityWindowId: window.getId(),
    consultationType: ConsultationType.Paid,
    scheduledAt: window.getStartTime(),
  });
  const session = ConsultationSession.open(appointment.getId());
  const doctor = DoctorProfile.reconstitute({
    id: appointment.getDoctorId(),
    accountId: '44444444-4444-4444-8444-444444444444',
    licenseNumber: 'LIC-1',
    specialtyId: '11111111-1111-4111-8111-111111111111',
    consultationFeeAmount: 500,
    languages: [],
    publications: [],
    awards: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const otherDoctor = DoctorProfile.reconstitute({
    id: '55555555-5555-4555-8555-555555555555',
    accountId: '66666666-6666-4666-8666-666666666666',
    licenseNumber: 'LIC-2',
    specialtyId: '11111111-1111-4111-8111-111111111111',
    consultationFeeAmount: 300,
    languages: [],
    publications: [],
    awards: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const availabilityWindowRepo = new InMemoryAvailabilityWindowRepository(window);
  const appointmentRepo = new InMemoryAppointmentRepository(appointment);
  const sessionRepo = new InMemoryConsultationSessionRepository(session);
  const doctorProfileRepo = new InMemoryDoctorProfileRepository(doctor, otherDoctor);
  const patientProfileRepo = new InMemoryPatientProfileRepository(patient);
  const paymentTransactionRepo = new InMemoryPaymentTransactionRepository();

  const unverifiedPatientAccountId = '11111111-1111-4111-1111-111111111111';
  const jwtSigner = new FakeJwtSigner(
    new Map([
      [PATIENT_TOKEN, { accountId: patient.getAccountId(), role: AccountRole.Patient }],
      [OTHER_PATIENT_TOKEN, { accountId: otherPatient.getAccountId(), role: AccountRole.Patient }],
      [DOCTOR_TOKEN, { accountId: doctor.getAccountId(), role: AccountRole.Doctor }],
      [OTHER_DOCTOR_TOKEN, { accountId: otherDoctor.getAccountId(), role: AccountRole.Doctor }],
      [UNVERIFIED_PATIENT_TOKEN, { accountId: unverifiedPatientAccountId, role: AccountRole.Patient }],
    ]),
  );

  const confirmAppointmentUseCase = new ConfirmAppointmentUseCase(
    appointmentRepo,
    sessionRepo,
    new ConfirmSlotUseCase(new ConfirmAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDomainEventDispatcher())),
    new NoopDomainEventDispatcher(),
  );
  const gateway = new FakeGateway(gatewaySucceeds);
  const initiateChargeUseCase = new InitiateChargeUseCase(
    paymentTransactionRepo,
    new NoopDomainEventDispatcher(),
    new GetConsultationSessionByIdUseCase(sessionRepo),
    new GetAppointmentByIdUseCase(appointmentRepo),
    new GetDoctorProfileByIdUseCase(doctorProfileRepo),
    confirmAppointmentUseCase,
    gateway,
  );
  const getPaymentTransactionByIdUseCase = new GetPaymentTransactionByIdUseCase(paymentTransactionRepo);
  const getPaymentTransactionByConsultationSessionIdUseCase = new GetPaymentTransactionByConsultationSessionIdUseCase(
    paymentTransactionRepo,
  );
  const refundPaymentUseCase = new RefundPaymentUseCase(paymentTransactionRepo, gateway, new NoopDomainEventDispatcher());
  const getDoctorProfileByAccountIdUseCase = new GetDoctorProfileByAccountIdUseCase(doctorProfileRepo);

  const moduleRef = await Test.createTestingModule({
    controllers: [PaymentController],
    providers: [
      PinoLoggerService,
      Reflector,
      JwtAuthGuard,
      RolesGuard,
      { provide: JWT_SIGNER, useFactory: () => jwtSigner },
      { provide: DOMAIN_EVENT_DISPATCHER, useClass: NoopDomainEventDispatcher },
      { provide: InitiateChargeUseCase, useValue: initiateChargeUseCase },
      { provide: GetPaymentTransactionByIdUseCase, useValue: getPaymentTransactionByIdUseCase },
      {
        provide: GetPaymentTransactionByConsultationSessionIdUseCase,
        useValue: getPaymentTransactionByConsultationSessionIdUseCase,
      },
      { provide: RefundPaymentUseCase, useValue: refundPaymentUseCase },
      { provide: GetPatientProfileByAccountIdUseCase, useFactory: () => new GetPatientProfileByAccountIdUseCase(patientProfileRepo) },
      { provide: GetDoctorProfileByAccountIdUseCase, useValue: getDoctorProfileByAccountIdUseCase },
      { provide: GetConsultationSessionByIdUseCase, useFactory: () => new GetConsultationSessionByIdUseCase(sessionRepo) },
      { provide: GetAppointmentByIdUseCase, useFactory: () => new GetAppointmentByIdUseCase(appointmentRepo) },
      RequiresIdentityVerificationGuard,
      {
        provide: CheckIdentityVerificationStatusUseCase,
        useValue: new FakeCheckIdentityVerificationStatusUseCase(
          new Set([patient.getAccountId(), otherPatient.getAccountId(), doctor.getAccountId(), otherDoctor.getAccountId()]),
        ),
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
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

  return { app, sessionId: session.getId() };
}

describe('PaymentController (integration)', () => {
  it('POST /payments rejects a request with no bearer token', async () => {
    const { app, sessionId } = await buildApp(true);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .send({
          idempotencyKey: 'idem-no-token',
          consultationSessionId: sessionId,
          amount: { amount: 500, currency: 'EGP' },
          paymentMethod: 'card',
        })
        .expect(401);

      assert.equal(response.body.error.code, 'UNAUTHORIZED');
    } finally {
      await app.close();
    }
  });

  it('POST /payments rejects a request missing the idempotencyKey with 400', async () => {
    const { app, sessionId } = await buildApp(true);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ consultationSessionId: sessionId, amount: { amount: 500, currency: 'EGP' }, paymentMethod: 'card' })
        .expect(400);

      assert.equal(response.body.error.code, 'VALIDATION_FAILED');
    } finally {
      await app.close();
    }
  });

  // Onboarding Redesign (2026-07-21 proposal, Stage O.4): the security
  // boundary itself -- a direct API call is blocked with 403 before the
  // handler's own session-ownership check ever runs.
  it('returns 403 IDENTITY_VERIFICATION_REQUIRED for an unverified patient', async () => {
    const { app, sessionId } = await buildApp(true);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${UNVERIFIED_PATIENT_TOKEN}`)
        .send({
          idempotencyKey: 'idem-unverified',
          consultationSessionId: sessionId,
          amount: { amount: 500, currency: 'EGP' },
          paymentMethod: 'card',
          paymentMethodToken: 'pm_test_card',
        })
        .expect(403);

      assert.equal(response.body.error.code, 'IDENTITY_VERIFICATION_REQUIRED');
    } finally {
      await app.close();
    }
  });

  it('POST /payments rejects a patient who was not treated in this consultation', async () => {
    const { app, sessionId } = await buildApp(true);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${OTHER_PATIENT_TOKEN}`)
        .send({
          idempotencyKey: 'idem-wrong-patient',
          consultationSessionId: sessionId,
          amount: { amount: 500, currency: 'EGP' },
          paymentMethod: 'card',
          paymentMethodToken: 'pm_test_card',
        })
        .expect(404);

      assert.equal(response.body.error.code, 'NOT_FOUND');
    } finally {
      await app.close();
    }
  });

  it('POST /payments succeeds and returns a Succeeded transaction', async () => {
    const { app, sessionId } = await buildApp(true);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({
          idempotencyKey: 'idem-succeeds',
          consultationSessionId: sessionId,
          amount: { amount: 500, currency: 'EGP' },
          paymentMethod: 'card',
          paymentMethodToken: 'pm_test_card',
        })
        .expect(201);

      assert.equal(response.body.data.status, 'succeeded');
      assert.equal(response.body.data.amount.currency, 'EGP');
    } finally {
      await app.close();
    }
  });

  it('POST /payments replays the original outcome instead of double-charging when the request is retried with the same idempotencyKey', async () => {
    const { app, sessionId } = await buildApp(true);
    try {
      const body = {
        idempotencyKey: 'idem-retry',
        consultationSessionId: sessionId,
        amount: { amount: 500, currency: 'EGP' },
        paymentMethod: 'card',
        paymentMethodToken: 'pm_test_card',
      };

      const first = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send(body)
        .expect(201);

      const retry = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send(body)
        .expect(201);

      assert.equal(retry.body.data.id, first.body.data.id);
      assert.equal(retry.body.data.status, 'succeeded');
    } finally {
      await app.close();
    }
  });

  it('POST /payments returns 409 when the same idempotencyKey is reused with a different request', async () => {
    const { app, sessionId } = await buildApp(true);
    try {
      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({
          idempotencyKey: 'idem-conflict',
          consultationSessionId: sessionId,
          amount: { amount: 500, currency: 'EGP' },
          paymentMethod: 'card',
          paymentMethodToken: 'pm_test_card',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({
          idempotencyKey: 'idem-conflict',
          consultationSessionId: sessionId,
          amount: { amount: 500, currency: 'EGP' },
          paymentMethod: 'mobile_wallet',
          paymentMethodToken: 'pm_test_card',
        })
        .expect(409);

      assert.equal(response.body.error.code, 'CONFLICT');
    } finally {
      await app.close();
    }
  });

  it('POST /payments returns 402 when the gateway declines', async () => {
    const { app, sessionId } = await buildApp(false);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({
          idempotencyKey: 'idem-declined',
          consultationSessionId: sessionId,
          amount: { amount: 500, currency: 'EGP' },
          paymentMethod: 'card',
          paymentMethodToken: 'pm_test_card',
        })
        .expect(402);

      assert.equal(response.body.error.code, 'PAYMENT_REQUIRED');
    } finally {
      await app.close();
    }
  });

  it('POST /payments returns 404 for an unknown consultationSessionId', async () => {
    const { app } = await buildApp(true);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({
          idempotencyKey: 'idem-unknown-session',
          consultationSessionId: '99999999-9999-4999-8999-999999999999',
          amount: { amount: 500, currency: 'EGP' },
          paymentMethod: 'card',
          paymentMethodToken: 'pm_test_card',
        })
        .expect(404);

      assert.equal(response.body.error.code, 'NOT_FOUND');
    } finally {
      await app.close();
    }
  });

  it('POST /payments rejects an invalid amount with 400', async () => {
    const { app, sessionId } = await buildApp(true);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({
          idempotencyKey: 'idem-invalid-amount',
          consultationSessionId: sessionId,
          amount: { amount: -5, currency: 'EGP' },
          paymentMethod: 'card',
        })
        .expect(400);

      assert.equal(response.body.error.code, 'VALIDATION_FAILED');
    } finally {
      await app.close();
    }
  });

  describe('GET /payments/:id', () => {
    it('rejects a request with no bearer token', async () => {
      const { app, sessionId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-get-no-token',
            consultationSessionId: sessionId,
            amount: { amount: 500, currency: 'EGP' },
            paymentMethod: 'card',
            paymentMethodToken: 'pm_test_card',
          })
          .expect(201);

        const response = await request(app.getHttpServer()).get(`/payments/${charge.body.data.id}`).expect(401);
        assert.equal(response.body.error.code, 'UNAUTHORIZED');
      } finally {
        await app.close();
      }
    });

    it('returns 400 (VALIDATION_FAILED) for a malformed id', async () => {
      const { app } = await buildApp(true);
      try {
        const response = await request(app.getHttpServer())
          .get('/payments/not-a-uuid')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .expect(400);

        assert.equal(response.body.error.code, 'VALIDATION_FAILED');
      } finally {
        await app.close();
      }
    });

    it('returns 404 for an id that does not exist', async () => {
      const { app } = await buildApp(true);
      try {
        const response = await request(app.getHttpServer())
          .get('/payments/99999999-9999-4999-8999-999999999999')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .expect(404);

        assert.equal(response.body.error.code, 'NOT_FOUND');
      } finally {
        await app.close();
      }
    });

    it('lets the owning patient fetch their own transaction', async () => {
      const { app, sessionId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-get-owner-patient',
            consultationSessionId: sessionId,
            amount: { amount: 500, currency: 'EGP' },
            paymentMethod: 'card',
            paymentMethodToken: 'pm_test_card',
          })
          .expect(201);

        const response = await request(app.getHttpServer())
          .get(`/payments/${charge.body.data.id}`)
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .expect(200);

        assert.equal(response.body.data.id, charge.body.data.id);
        assert.equal(response.body.data.status, 'succeeded');
      } finally {
        await app.close();
      }
    });

    it('lets the treating doctor fetch the same transaction', async () => {
      const { app, sessionId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-get-owner-doctor',
            consultationSessionId: sessionId,
            amount: { amount: 500, currency: 'EGP' },
            paymentMethod: 'card',
            paymentMethodToken: 'pm_test_card',
          })
          .expect(201);

        const response = await request(app.getHttpServer())
          .get(`/payments/${charge.body.data.id}`)
          .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
          .expect(200);

        assert.equal(response.body.data.id, charge.body.data.id);
      } finally {
        await app.close();
      }
    });

    it('returns 404 (never leaking existence) for a patient who does not own the transaction', async () => {
      const { app, sessionId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-get-non-owner-patient',
            consultationSessionId: sessionId,
            amount: { amount: 500, currency: 'EGP' },
            paymentMethod: 'card',
            paymentMethodToken: 'pm_test_card',
          })
          .expect(201);

        const response = await request(app.getHttpServer())
          .get(`/payments/${charge.body.data.id}`)
          .set('Authorization', `Bearer ${OTHER_PATIENT_TOKEN}`)
          .expect(404);

        assert.equal(response.body.error.code, 'NOT_FOUND');
      } finally {
        await app.close();
      }
    });

    it('returns 404 (never leaking existence) for a doctor who did not treat this patient', async () => {
      const { app, sessionId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-get-non-owner-doctor',
            consultationSessionId: sessionId,
            amount: { amount: 500, currency: 'EGP' },
            paymentMethod: 'card',
            paymentMethodToken: 'pm_test_card',
          })
          .expect(201);

        const response = await request(app.getHttpServer())
          .get(`/payments/${charge.body.data.id}`)
          .set('Authorization', `Bearer ${OTHER_DOCTOR_TOKEN}`)
          .expect(404);

        assert.equal(response.body.error.code, 'NOT_FOUND');
      } finally {
        await app.close();
      }
    });
  });

  describe('POST /payments/:id/refund', () => {
    it('rejects a request with no bearer token', async () => {
      const { app, sessionId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-refund-no-token',
            consultationSessionId: sessionId,
            amount: { amount: 500, currency: 'EGP' },
            paymentMethod: 'card',
            paymentMethodToken: 'pm_test_card',
          })
          .expect(201);

        const response = await request(app.getHttpServer()).post(`/payments/${charge.body.data.id}/refund`).expect(401);
        assert.equal(response.body.error.code, 'UNAUTHORIZED');
      } finally {
        await app.close();
      }
    });

    it('forbids a patient from calling the doctor-only refund route (403)', async () => {
      const { app, sessionId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-refund-forbidden-role',
            consultationSessionId: sessionId,
            amount: { amount: 500, currency: 'EGP' },
            paymentMethod: 'card',
            paymentMethodToken: 'pm_test_card',
          })
          .expect(201);

        const response = await request(app.getHttpServer())
          .post(`/payments/${charge.body.data.id}/refund`)
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .expect(403);

        assert.equal(response.body.error.code, 'FORBIDDEN');
      } finally {
        await app.close();
      }
    });

    it('returns 400 (VALIDATION_FAILED) for a malformed id', async () => {
      const { app } = await buildApp(true);
      try {
        const response = await request(app.getHttpServer())
          .post('/payments/not-a-uuid/refund')
          .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
          .expect(400);

        assert.equal(response.body.error.code, 'VALIDATION_FAILED');
      } finally {
        await app.close();
      }
    });

    it('returns 404 for an id that does not exist', async () => {
      const { app } = await buildApp(true);
      try {
        const response = await request(app.getHttpServer())
          .post('/payments/99999999-9999-4999-8999-999999999999/refund')
          .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
          .expect(404);

        assert.equal(response.body.error.code, 'NOT_FOUND');
      } finally {
        await app.close();
      }
    });

    it('returns 404 (never leaking existence) when a doctor who did not treat this patient tries to refund', async () => {
      const { app, sessionId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-refund-non-owner-doctor',
            consultationSessionId: sessionId,
            amount: { amount: 500, currency: 'EGP' },
            paymentMethod: 'card',
            paymentMethodToken: 'pm_test_card',
          })
          .expect(201);

        const response = await request(app.getHttpServer())
          .post(`/payments/${charge.body.data.id}/refund`)
          .set('Authorization', `Bearer ${OTHER_DOCTOR_TOKEN}`)
          .expect(404);

        assert.equal(response.body.error.code, 'NOT_FOUND');
      } finally {
        await app.close();
      }
    });

    it('lets the treating doctor refund a succeeded transaction', async () => {
      const { app, sessionId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-refund-success',
            consultationSessionId: sessionId,
            amount: { amount: 500, currency: 'EGP' },
            paymentMethod: 'card',
            paymentMethodToken: 'pm_test_card',
          })
          .expect(201);

        const response = await request(app.getHttpServer())
          .post(`/payments/${charge.body.data.id}/refund`)
          .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
          .expect(200);

        assert.equal(response.body.data.status, 'refunded');
      } finally {
        await app.close();
      }
    });

    it('returns 422 (VALIDATION_FAILED) when refunding an already-refunded transaction', async () => {
      const { app, sessionId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-refund-twice',
            consultationSessionId: sessionId,
            amount: { amount: 500, currency: 'EGP' },
            paymentMethod: 'card',
            paymentMethodToken: 'pm_test_card',
          })
          .expect(201);

        await request(app.getHttpServer())
          .post(`/payments/${charge.body.data.id}/refund`)
          .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
          .expect(200);

        const response = await request(app.getHttpServer())
          .post(`/payments/${charge.body.data.id}/refund`)
          .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
          .expect(422);

        assert.equal(response.body.error.code, 'VALIDATION_FAILED');
      } finally {
        await app.close();
      }
    });
  });

  describe('GET /payments/by-consultation-session/:consultationSessionId', () => {
    it('rejects a request with no bearer token', async () => {
      const { app, sessionId } = await buildApp(true);
      try {
        const response = await request(app.getHttpServer())
          .get(`/payments/by-consultation-session/${sessionId}`)
          .expect(401);
        assert.equal(response.body.error.code, 'UNAUTHORIZED');
      } finally {
        await app.close();
      }
    });

    it('forbids a patient from calling the doctor-only route (403)', async () => {
      const { app, sessionId } = await buildApp(true);
      try {
        const response = await request(app.getHttpServer())
          .get(`/payments/by-consultation-session/${sessionId}`)
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .expect(403);
        assert.equal(response.body.error.code, 'FORBIDDEN');
      } finally {
        await app.close();
      }
    });

    it('returns 400 (VALIDATION_FAILED) for a malformed session id', async () => {
      const { app } = await buildApp(true);
      try {
        const response = await request(app.getHttpServer())
          .get('/payments/by-consultation-session/not-a-uuid')
          .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
          .expect(400);
        assert.equal(response.body.error.code, 'VALIDATION_FAILED');
      } finally {
        await app.close();
      }
    });

    it('returns 404 for an unknown consultation session id', async () => {
      const { app } = await buildApp(true);
      try {
        const response = await request(app.getHttpServer())
          .get('/payments/by-consultation-session/99999999-9999-4999-8999-999999999999')
          .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
          .expect(404);
        assert.equal(response.body.error.code, 'NOT_FOUND');
      } finally {
        await app.close();
      }
    });

    it('returns 404 (never leaking existence) for a doctor who did not treat this patient', async () => {
      const { app, sessionId } = await buildApp(true);
      try {
        const response = await request(app.getHttpServer())
          .get(`/payments/by-consultation-session/${sessionId}`)
          .set('Authorization', `Bearer ${OTHER_DOCTOR_TOKEN}`)
          .expect(404);
        assert.equal(response.body.error.code, 'NOT_FOUND');
      } finally {
        await app.close();
      }
    });

    it('returns null data when the session has no payment transaction yet', async () => {
      const { app, sessionId } = await buildApp(true);
      try {
        const response = await request(app.getHttpServer())
          .get(`/payments/by-consultation-session/${sessionId}`)
          .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
          .expect(200);
        assert.equal(response.body.data, null);
      } finally {
        await app.close();
      }
    });

    it('lets the treating doctor discover the transaction for their session', async () => {
      const { app, sessionId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-by-session-lookup',
            consultationSessionId: sessionId,
            amount: { amount: 500, currency: 'EGP' },
            paymentMethod: 'card',
            paymentMethodToken: 'pm_test_card',
          })
          .expect(201);

        const response = await request(app.getHttpServer())
          .get(`/payments/by-consultation-session/${sessionId}`)
          .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
          .expect(200);

        assert.equal(response.body.data.id, charge.body.data.id);
      } finally {
        await app.close();
      }
    });
  });
});
