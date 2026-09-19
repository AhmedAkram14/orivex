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
import type { AppointmentRepository } from '../../../consultation/domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../consultation/domain/repositories/consultation-session.repository.js';
import { ConsultationPricing } from '../../../consultation/domain/value-objects/consultation-pricing.value-object.js';
import { Money as ConsultationMoney } from '../../../consultation/domain/value-objects/money.value-object.js';
import { ConfirmAvailabilityWindowUseCase } from '../../../doctor/application/use-cases/confirm-availability-window/confirm-availability-window.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { AvailabilityWindow } from '../../../doctor/domain/entities/availability-window.entity.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import { ConsultationPricing as DoctorConsultationPricing } from '../../../doctor/domain/value-objects/consultation-pricing.value-object.js';
import { Money as DoctorMoney } from '../../../doctor/domain/value-objects/money.value-object.js';
import type { AvailabilityWindowRepository } from '../../../doctor/domain/repositories/availability-window.repository.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { Account } from '../../../identity/domain/entities/account.entity.js';
import { UserProfile } from '../../../identity/domain/entities/user-profile.entity.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { AccountStatus } from '../../../identity/domain/enums/account-status.enum.js';
import { Language } from '../../../identity/domain/enums/language.enum.js';
import type { AccountRepository } from '../../../identity/domain/repositories/account.repository.js';
import { AccountId } from '../../../identity/domain/value-objects/account-id.value-object.js';
import { DisplayName } from '../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../identity/domain/value-objects/email-address.value-object.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import { ConfirmSlotUseCase } from '../../../scheduling/application/use-cases/confirm-slot/confirm-slot.use-case.js';
import { InitiateChargeUseCase } from '../../application/use-cases/initiate-charge/initiate-charge.use-case.js';
import { GetPaymentTransactionByConsultationSessionIdUseCase } from '../../application/use-cases/get-payment-transaction-by-consultation-session-id/get-payment-transaction-by-consultation-session-id.use-case.js';
import { GetDoctorEarningsSummaryUseCase } from '../../application/use-cases/get-doctor-earnings-summary/get-doctor-earnings-summary.use-case.js';
import { GetDoctorEarningsTransactionsUseCase } from '../../application/use-cases/get-doctor-earnings-transactions/get-doctor-earnings-transactions.use-case.js';
import { GetPaymentTransactionByIdUseCase } from '../../application/use-cases/get-payment-transaction-by-id/get-payment-transaction-by-id.use-case.js';
import { RefundPaymentUseCase } from '../../application/use-cases/refund-payment/refund-payment.use-case.js';
import type { PaymentGatewayPort } from '../../application/ports/payment-gateway.port.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';
import { PaymentStatus } from '../../domain/enums/payment-status.enum.js';
import { PaymentTransaction } from '../../domain/entities/payment-transaction.entity.js';
import { Money } from '../../domain/value-objects/money.value-object.js';
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
  private readonly profiles: PatientProfile[];
  constructor(...profiles: PatientProfile[]) {
    this.profiles = profiles;
  }
  async findById(id: string): Promise<PatientProfile | null> {
    return this.profiles.find((profile) => profile.getId() === id) ?? null;
  }
  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    return this.profiles.find((profile) => profile.getAccountId() === accountId) ?? null;
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
  findAll(): Promise<{ accounts: Account[]; total: number }> {
    return Promise.resolve({ accounts: [], total: 0 });
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
  async findByPatientAndDoctor(): Promise<Appointment | null> {
    return null;
  }
  async findByDoctorIdForDateRange(doctorId: string): Promise<Appointment[]> {
    return this.findByDoctorId(doctorId);
  }
  async countByDoctorIds(): Promise<Map<string, number>> {
    return new Map();
  }
  async countByStatusForDoctor(): Promise<Partial<Record<string, number>>> {
    return {};
  }
  async countByStatusForDoctorInRange(): Promise<Partial<Record<string, number>>> {
    return {};
  }
  async countFreeRequestedForDoctorInRange(): Promise<number> {
    return 0;
  }
  async countByDoctorIdBucketed(): Promise<{ bucket: string; count: number }[]> {
    return [];
  }
  async save(): Promise<void> {}
}

// Stateful (unlike the other in-memory fakes in this file) -- unlike the
// old consultationSessionId-keyed charge flow, a ConsultationSession no
// longer exists before a charge succeeds (pay-then-confirm); it's
// ConfirmAppointmentUseCase (called from inside InitiateChargeUseCase) that
// creates and saves one for the first time. Tests that need a session with
// no payment transaction attached to it seed one directly via save().
class InMemoryConsultationSessionRepository implements ConsultationSessionRepository {
  private readonly byId = new Map<string, ConsultationSession>();
  async findById(id: string): Promise<ConsultationSession | null> {
    return this.byId.get(id) ?? null;
  }
  async findByAppointmentId(appointmentId: string): Promise<ConsultationSession | null> {
    return Array.from(this.byId.values()).find((session) => session.getAppointmentId() === appointmentId) ?? null;
  }
  async findStale(): Promise<ConsultationSession[]> {
    return [];
  }
  async save(session: ConsultationSession): Promise<void> {
    this.byId.set(session.getId(), session);
  }
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
  async deleteById(): Promise<void> {}
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
  async findByAppointmentId(appointmentId: string): Promise<PaymentTransaction | null> {
    return Array.from(this.byId.values()).find((t) => t.getAppointmentId() === appointmentId) ?? null;
  }
  async findByDoctorId(doctorId: string, range?: { from?: Date; to?: Date }): Promise<PaymentTransaction[]> {
    return Array.from(this.byId.values())
      .filter((transaction) => {
        if (transaction.getDoctorId() !== doctorId) return false;
        const createdAt = transaction.getCreatedAt();
        if (range?.from && createdAt < range.from) return false;
        if (range?.to && createdAt >= range.to) return false;
        return true;
      })
      .sort((a, b) => b.getCreatedAt().getTime() - a.getCreatedAt().getTime());
  }
  async findAll(): Promise<{ transactions: PaymentTransaction[]; total: number }> {
    return { transactions: [], total: 0 };
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

async function buildApp(gatewaySucceeds: boolean): Promise<{
  app: INestApplication;
  appointmentId: string;
  sessionRepo: InMemoryConsultationSessionRepository;
  paymentTransactionRepo: InMemoryPaymentTransactionRepository;
  doctorId: string;
  otherDoctorId: string;
  patientId: string;
  otherPatientId: string;
}> {
  const window = AvailabilityWindow.define({
    doctorId: '33333333-3333-4333-8333-333333333333',
    startTime: new Date(Date.now() + 60 * 60_000),
    endTime: new Date(Date.now() + 90 * 60_000),
    pricing: DoctorConsultationPricing.paid(DoctorMoney.create(500, 'EGP')),
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
    pricing: ConsultationPricing.paid(ConsultationMoney.create(500, 'EGP')),
    scheduledAt: window.getStartTime(),
  });
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

  // Doctor Earnings page rebuild (Phase 1) -- real Account entities so the
  // new earnings-transactions route's patient-name resolution
  // (GetPatientProfileByIdUseCase -> GetAccountByIdUseCase ->
  // getUserProfile().getDisplayName()) has something real to resolve.
  const patientAccount = Account.reconstitute({
    id: AccountId.create(patient.getAccountId()),
    email: EmailAddress.create('patient@example.com'),
    role: AccountRole.Patient,
    status: AccountStatus.Active,
    userProfile: UserProfile.create({ displayName: DisplayName.create('Amina Youssef'), preferredLanguage: Language.Arabic }),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const otherPatientAccount = Account.reconstitute({
    id: AccountId.create(otherPatient.getAccountId()),
    email: EmailAddress.create('other-patient@example.com'),
    role: AccountRole.Patient,
    status: AccountStatus.Active,
    userProfile: UserProfile.create({ displayName: DisplayName.create('Sara Hassan'), preferredLanguage: Language.Arabic }),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const availabilityWindowRepo = new InMemoryAvailabilityWindowRepository(window);
  const appointmentRepo = new InMemoryAppointmentRepository(appointment);
  const sessionRepo = new InMemoryConsultationSessionRepository();
  const doctorProfileRepo = new InMemoryDoctorProfileRepository(doctor, otherDoctor);
  const patientProfileRepo = new InMemoryPatientProfileRepository(patient, otherPatient);
  const accountRepo = new InMemoryAccountRepository([patientAccount, otherPatientAccount]);
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
    new GetAppointmentByIdUseCase(appointmentRepo),
    confirmAppointmentUseCase,
    gateway,
  );
  const getPaymentTransactionByIdUseCase = new GetPaymentTransactionByIdUseCase(paymentTransactionRepo);
  const getPaymentTransactionByConsultationSessionIdUseCase = new GetPaymentTransactionByConsultationSessionIdUseCase(
    paymentTransactionRepo,
  );
  const refundPaymentUseCase = new RefundPaymentUseCase(paymentTransactionRepo, gateway, new NoopDomainEventDispatcher());
  const getDoctorProfileByAccountIdUseCase = new GetDoctorProfileByAccountIdUseCase(doctorProfileRepo);
  const getDoctorEarningsSummaryUseCase = new GetDoctorEarningsSummaryUseCase(paymentTransactionRepo);
  const getDoctorEarningsTransactionsUseCase = new GetDoctorEarningsTransactionsUseCase(paymentTransactionRepo);
  const getAccountByIdUseCase = new GetAccountByIdUseCase(accountRepo);
  const getPatientProfileByIdUseCase = new GetPatientProfileByIdUseCase(patientProfileRepo);

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
      { provide: GetDoctorEarningsSummaryUseCase, useValue: getDoctorEarningsSummaryUseCase },
      { provide: GetDoctorEarningsTransactionsUseCase, useValue: getDoctorEarningsTransactionsUseCase },
      { provide: GetAccountByIdUseCase, useValue: getAccountByIdUseCase },
      { provide: GetPatientProfileByIdUseCase, useValue: getPatientProfileByIdUseCase },
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

  return {
    app,
    appointmentId: appointment.getId(),
    sessionRepo,
    paymentTransactionRepo,
    doctorId: doctor.getId(),
    otherDoctorId: otherDoctor.getId(),
    patientId: patient.getId(),
    otherPatientId: otherPatient.getId(),
  };
}

describe('PaymentController (integration)', () => {
  it('POST /payments rejects a request with no bearer token', async () => {
    const { app, appointmentId } = await buildApp(true);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .send({
          idempotencyKey: 'idem-no-token',
          appointmentId,
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
    const { app, appointmentId } = await buildApp(true);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ appointmentId, amount: { amount: 500, currency: 'EGP' }, paymentMethod: 'card' })
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
    const { app, appointmentId } = await buildApp(true);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${UNVERIFIED_PATIENT_TOKEN}`)
        .send({
          idempotencyKey: 'idem-unverified',
          appointmentId,
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
    const { app, appointmentId } = await buildApp(true);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${OTHER_PATIENT_TOKEN}`)
        .send({
          idempotencyKey: 'idem-wrong-patient',
          appointmentId,
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
    const { app, appointmentId } = await buildApp(true);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({
          idempotencyKey: 'idem-succeeds',
          appointmentId,
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
    const { app, appointmentId } = await buildApp(true);
    try {
      const body = {
        idempotencyKey: 'idem-retry',
        appointmentId,
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
    const { app, appointmentId } = await buildApp(true);
    try {
      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({
          idempotencyKey: 'idem-conflict',
          appointmentId,
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
          appointmentId,
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
    const { app, appointmentId } = await buildApp(false);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({
          idempotencyKey: 'idem-declined',
          appointmentId,
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

  it('POST /payments returns 404 for an unknown appointmentId', async () => {
    const { app } = await buildApp(true);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({
          idempotencyKey: 'idem-unknown-appointment',
          appointmentId: '99999999-9999-4999-8999-999999999999',
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
    const { app, appointmentId } = await buildApp(true);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({
          idempotencyKey: 'idem-invalid-amount',
          appointmentId,
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
      const { app, appointmentId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-get-no-token',
            appointmentId,
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
      const { app, appointmentId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-get-owner-patient',
            appointmentId,
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
      const { app, appointmentId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-get-owner-doctor',
            appointmentId,
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
      const { app, appointmentId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-get-non-owner-patient',
            appointmentId,
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
      const { app, appointmentId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-get-non-owner-doctor',
            appointmentId,
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
      const { app, appointmentId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-refund-no-token',
            appointmentId,
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
      const { app, appointmentId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-refund-forbidden-role',
            appointmentId,
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
      const { app, appointmentId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-refund-non-owner-doctor',
            appointmentId,
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
      const { app, appointmentId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-refund-success',
            appointmentId,
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
      const { app, appointmentId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-refund-twice',
            appointmentId,
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

  // Consultation Pricing Lifecycle Completion: no ConsultationSession
  // exists before a charge succeeds (pay-then-confirm), so this describe
  // block's fixtures diverge per test -- most tests here need only *a*
  // session that references the correct appointment/doctor pairing (seeded
  // directly via sessionRepo, bypassing the charge flow entirely, since
  // these are guard/negative-path tests unrelated to charging), while the
  // "lets the treating doctor discover the transaction" test needs the
  // *real* session id ConfirmAppointmentUseCase created as a side effect of
  // an actual successful charge, read back off the charge response's own
  // consultationSessionId field.
  describe('GET /payments/by-consultation-session/:consultationSessionId', () => {
    it('rejects a request with no bearer token', async () => {
      const { app, appointmentId, sessionRepo } = await buildApp(true);
      try {
        const session = ConsultationSession.open(appointmentId);
        await sessionRepo.save(session);

        const response = await request(app.getHttpServer())
          .get(`/payments/by-consultation-session/${session.getId()}`)
          .expect(401);
        assert.equal(response.body.error.code, 'UNAUTHORIZED');
      } finally {
        await app.close();
      }
    });

    it('forbids a patient from calling the doctor-only route (403)', async () => {
      const { app, appointmentId, sessionRepo } = await buildApp(true);
      try {
        const session = ConsultationSession.open(appointmentId);
        await sessionRepo.save(session);

        const response = await request(app.getHttpServer())
          .get(`/payments/by-consultation-session/${session.getId()}`)
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
      const { app, appointmentId, sessionRepo } = await buildApp(true);
      try {
        const session = ConsultationSession.open(appointmentId);
        await sessionRepo.save(session);

        const response = await request(app.getHttpServer())
          .get(`/payments/by-consultation-session/${session.getId()}`)
          .set('Authorization', `Bearer ${OTHER_DOCTOR_TOKEN}`)
          .expect(404);
        assert.equal(response.body.error.code, 'NOT_FOUND');
      } finally {
        await app.close();
      }
    });

    it('returns null data when the session has no payment transaction yet', async () => {
      const { app, appointmentId, sessionRepo } = await buildApp(true);
      try {
        const session = ConsultationSession.open(appointmentId);
        await sessionRepo.save(session);

        const response = await request(app.getHttpServer())
          .get(`/payments/by-consultation-session/${session.getId()}`)
          .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
          .expect(200);
        assert.equal(response.body.data, null);
      } finally {
        await app.close();
      }
    });

    it('lets the treating doctor discover the transaction for their session', async () => {
      const { app, appointmentId } = await buildApp(true);
      try {
        const charge = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .send({
            idempotencyKey: 'idem-by-session-lookup',
            appointmentId,
            amount: { amount: 500, currency: 'EGP' },
            paymentMethod: 'card',
            paymentMethodToken: 'pm_test_card',
          })
          .expect(201);

        // The real session id ConfirmAppointmentUseCase created and
        // attached as a side effect of the charge succeeding -- not a
        // pre-seeded fixture id, since no session exists before a charge.
        const sessionId = charge.body.data.consultationSessionId;
        assert.ok(sessionId, 'a successful charge must attach a consultationSessionId');

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

  // Doctor Earnings page rebuild (Phase 1) -- regression check only, not a
  // re-test of Phase 0's own use-case-level coverage: confirms the route
  // still works end to end now that it takes the real
  // DoctorEarningsFilterQueryDto instead of the old ?month= compile-shim.
  describe('GET /payments/doctor/earnings-summary', () => {
    it('rejects a request with no bearer token', async () => {
      const { app } = await buildApp(true);
      try {
        const response = await request(app.getHttpServer()).get('/payments/doctor/earnings-summary').expect(401);
        assert.equal(response.body.error.code, 'UNAUTHORIZED');
      } finally {
        await app.close();
      }
    });

    it('forbids a patient from calling the doctor-only route (403)', async () => {
      const { app } = await buildApp(true);
      try {
        const response = await request(app.getHttpServer())
          .get('/payments/doctor/earnings-summary')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .expect(403);
        assert.equal(response.body.error.code, 'FORBIDDEN');
      } finally {
        await app.close();
      }
    });

    it('returns 400 (VALIDATION_FAILED) for a malformed dateFrom', async () => {
      const { app } = await buildApp(true);
      try {
        const response = await request(app.getHttpServer())
          .get('/payments/doctor/earnings-summary')
          .query({ dateFrom: 'not-a-date' })
          .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
          .expect(400);
        assert.equal(response.body.error.code, 'VALIDATION_FAILED');
      } finally {
        await app.close();
      }
    });

    it('returns an honest empty summary with the default trailing-30-day window applied', async () => {
      const { app } = await buildApp(true);
      try {
        const response = await request(app.getHttpServer())
          .get('/payments/doctor/earnings-summary')
          .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
          .expect(200);
        assert.equal(response.body.data.lifetimeTransactionCount, 0);
        assert.deepEqual(response.body.data.cycles, []);
      } finally {
        await app.close();
      }
    });

    it('keeps lifetime totals unaffected by a narrow dateFrom/dateTo range end to end', async () => {
      const { app, paymentTransactionRepo, doctorId, patientId } = await buildApp(true);
      try {
        await paymentTransactionRepo.save(
          PaymentTransaction.reconstitute({
            id: 'outside-range-txn',
            idempotencyKey: 'idem-outside-range',
            appointmentId: 'appointment-outside-range',
            patientId,
            doctorId,
            amount: Money.create(1000, 'EGP'),
            paymentMethod: PaymentMethod.Card,
            status: PaymentStatus.Succeeded,
            createdAt: new Date('2020-01-15T00:00:00.000Z'),
            updatedAt: new Date('2020-01-15T00:00:00.000Z'),
          }),
        );

        const response = await request(app.getHttpServer())
          .get('/payments/doctor/earnings-summary')
          .query({ dateFrom: '2026-09-01T00:00:00.000Z', dateTo: '2026-10-01T00:00:00.000Z' })
          .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
          .expect(200);

        assert.equal(response.body.data.lifetimeTransactionCount, 1);
        assert.equal(response.body.data.lifetimeGrossAmount, 1000);
        assert.deepEqual(response.body.data.cycles, []);
      } finally {
        await app.close();
      }
    });
  });

  describe('GET /payments/doctor/earnings-transactions', () => {
    it('rejects a request with no bearer token', async () => {
      const { app } = await buildApp(true);
      try {
        const response = await request(app.getHttpServer()).get('/payments/doctor/earnings-transactions').expect(401);
        assert.equal(response.body.error.code, 'UNAUTHORIZED');
      } finally {
        await app.close();
      }
    });

    it('forbids a patient from calling the doctor-only route (403)', async () => {
      const { app } = await buildApp(true);
      try {
        const response = await request(app.getHttpServer())
          .get('/payments/doctor/earnings-transactions')
          .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
          .expect(403);
        assert.equal(response.body.error.code, 'FORBIDDEN');
      } finally {
        await app.close();
      }
    });

    it('returns 400 (VALIDATION_FAILED) for a malformed dateTo', async () => {
      const { app } = await buildApp(true);
      try {
        const response = await request(app.getHttpServer())
          .get('/payments/doctor/earnings-transactions')
          .query({ dateTo: 'not-a-date' })
          .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
          .expect(400);
        assert.equal(response.body.error.code, 'VALIDATION_FAILED');
      } finally {
        await app.close();
      }
    });

    it('never leaks another doctor\'s transactions -- strict doctor-scoping', async () => {
      const { app, paymentTransactionRepo, doctorId, otherDoctorId, patientId } = await buildApp(true);
      try {
        await paymentTransactionRepo.save(
          PaymentTransaction.reconstitute({
            id: 'mine-txn',
            idempotencyKey: 'idem-mine',
            appointmentId: 'appointment-mine',
            patientId,
            doctorId,
            amount: Money.create(500, 'EGP'),
            paymentMethod: PaymentMethod.Card,
            status: PaymentStatus.Succeeded,
            createdAt: new Date('2026-09-05T00:00:00.000Z'),
            updatedAt: new Date('2026-09-05T00:00:00.000Z'),
          }),
        );
        await paymentTransactionRepo.save(
          PaymentTransaction.reconstitute({
            id: 'other-doctor-txn',
            idempotencyKey: 'idem-other-doctor',
            appointmentId: 'appointment-other-doctor',
            patientId,
            doctorId: otherDoctorId,
            amount: Money.create(900, 'EGP'),
            paymentMethod: PaymentMethod.Card,
            status: PaymentStatus.Succeeded,
            createdAt: new Date('2026-09-06T00:00:00.000Z'),
            updatedAt: new Date('2026-09-06T00:00:00.000Z'),
          }),
        );

        const response = await request(app.getHttpServer())
          .get('/payments/doctor/earnings-transactions')
          .query({ dateFrom: '2026-09-01T00:00:00.000Z', dateTo: '2026-10-01T00:00:00.000Z' })
          .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
          .expect(200);

        assert.equal(response.body.data.length, 1);
        assert.equal(response.body.data[0].id, 'mine-txn');

        const otherResponse = await request(app.getHttpServer())
          .get('/payments/doctor/earnings-transactions')
          .query({ dateFrom: '2026-09-01T00:00:00.000Z', dateTo: '2026-10-01T00:00:00.000Z' })
          .set('Authorization', `Bearer ${OTHER_DOCTOR_TOKEN}`)
          .expect(200);

        assert.equal(otherResponse.body.data.length, 1);
        assert.equal(otherResponse.body.data[0].id, 'other-doctor-txn');
      } finally {
        await app.close();
      }
    });

    it('resolves patient names for multiple transactions, de-duplicated by patientId, and surfaces a Refunded row', async () => {
      const { app, paymentTransactionRepo, doctorId, patientId, otherPatientId } = await buildApp(true);
      try {
        await paymentTransactionRepo.save(
          PaymentTransaction.reconstitute({
            id: 'first-visit',
            idempotencyKey: 'idem-first-visit',
            appointmentId: 'appointment-first-visit',
            patientId,
            doctorId,
            amount: Money.create(500, 'EGP'),
            paymentMethod: PaymentMethod.Card,
            status: PaymentStatus.Succeeded,
            createdAt: new Date('2026-09-05T00:00:00.000Z'),
            updatedAt: new Date('2026-09-05T00:00:00.000Z'),
          }),
        );
        await paymentTransactionRepo.save(
          PaymentTransaction.reconstitute({
            id: 'second-visit-same-patient',
            idempotencyKey: 'idem-second-visit',
            appointmentId: 'appointment-second-visit',
            patientId,
            doctorId,
            amount: Money.create(500, 'EGP'),
            paymentMethod: PaymentMethod.Card,
            status: PaymentStatus.Succeeded,
            createdAt: new Date('2026-09-06T00:00:00.000Z'),
            updatedAt: new Date('2026-09-06T00:00:00.000Z'),
          }),
        );
        await paymentTransactionRepo.save(
          PaymentTransaction.reconstitute({
            id: 'refunded-visit',
            idempotencyKey: 'idem-refunded-visit',
            appointmentId: 'appointment-refunded-visit',
            patientId: otherPatientId,
            doctorId,
            amount: Money.create(700, 'EGP'),
            paymentMethod: PaymentMethod.Card,
            status: PaymentStatus.Refunded,
            createdAt: new Date('2026-09-07T00:00:00.000Z'),
            updatedAt: new Date('2026-09-07T00:00:00.000Z'),
          }),
        );

        const response = await request(app.getHttpServer())
          .get('/payments/doctor/earnings-transactions')
          .query({ dateFrom: '2026-09-01T00:00:00.000Z', dateTo: '2026-10-01T00:00:00.000Z' })
          .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
          .expect(200);

        assert.equal(response.body.data.length, 3);
        // Newest first.
        const [refunded, second, first] = response.body.data;

        assert.equal(refunded.id, 'refunded-visit');
        assert.equal(refunded.status, 'refunded');
        assert.equal(refunded.patientName, 'Sara Hassan');

        assert.equal(second.id, 'second-visit-same-patient');
        assert.equal(second.patientName, 'Amina Youssef');
        assert.equal(first.id, 'first-visit');
        assert.equal(first.patientName, 'Amina Youssef');
      } finally {
        await app.close();
      }
    });
  });
});
