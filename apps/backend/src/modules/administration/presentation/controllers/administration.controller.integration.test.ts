import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { Reflector } from '@nestjs/core';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { ACCOUNT_REPOSITORY } from '../../../identity/application/ports/tokens.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { ListAccountsUseCase } from '../../../identity/application/use-cases/list-accounts/list-accounts.use-case.js';
import { UpdateAccountRoleUseCase } from '../../../identity/application/use-cases/update-account-role/update-account-role.use-case.js';
import { Account } from '../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository, ListAccountsOptions } from '../../../identity/domain/repositories/account.repository.js';
import { DisplayName } from '../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../identity/domain/value-objects/email-address.value-object.js';
import { DOCTOR_PROFILE_REPOSITORY } from '../../../doctor/application/ports/tokens.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { PATIENT_PROFILE_REPOSITORY } from '../../../patient/application/ports/tokens.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import { PAYMENT_GATEWAY, PAYMENT_TRANSACTION_REPOSITORY } from '../../../payment/application/ports/tokens.js';
import type { PaymentGatewayPort, RefundPaymentRequest, RefundPaymentResult } from '../../../payment/application/ports/payment-gateway.port.js';
import { ListPaymentTransactionsUseCase } from '../../../payment/application/use-cases/list-payment-transactions/list-payment-transactions.use-case.js';
import { RefundPaymentUseCase } from '../../../payment/application/use-cases/refund-payment/refund-payment.use-case.js';
import { PaymentTransaction } from '../../../payment/domain/entities/payment-transaction.entity.js';
import { PaymentMethod } from '../../../payment/domain/enums/payment-method.enum.js';
import type { PaymentTransactionRepository } from '../../../payment/domain/repositories/payment-transaction.repository.js';
import { Money } from '../../../payment/domain/value-objects/money.value-object.js';
import { DecideVerificationUseCase } from '../../../trust/application/use-cases/decide-verification/decide-verification.use-case.js';
import { GetVerificationCaseByIdUseCase } from '../../../trust/application/use-cases/get-verification-case-by-id/get-verification-case-by-id.use-case.js';
import { ListPendingVerificationCasesUseCase } from '../../../trust/application/use-cases/list-pending-verification-cases/list-pending-verification-cases.use-case.js';
import { ListSecurityEventsForAccountUseCase } from '../../../trust/application/use-cases/list-security-events-for-account/list-security-events-for-account.use-case.js';
import { ListVerificationCasesForSubjectUseCase } from '../../../trust/application/use-cases/list-verification-cases-for-subject/list-verification-cases-for-subject.use-case.js';
import { SuspendVerificationCaseUseCase } from '../../../trust/application/use-cases/suspend-verification-case/suspend-verification-case.use-case.js';
import type { SecurityEvent } from '../../../trust/domain/entities/security-event.entity.js';
import { VerificationCase } from '../../../trust/domain/entities/verification-case.entity.js';
import { VerificationStatus } from '../../../trust/domain/enums/verification-status.enum.js';
import type { VerificationSubjectType } from '../../../trust/domain/enums/verification-subject-type.enum.js';
import type { SecurityEventRepository } from '../../../trust/domain/repositories/security-event.repository.js';
import type { VerificationCaseRepository } from '../../../trust/domain/repositories/verification-case.repository.js';
import { DoctorProfessionalDetails } from '../../../trust/domain/value-objects/doctor-professional-details.js';
import { PatientIdentityDetails } from '../../../trust/domain/value-objects/patient-identity-details.js';
import { DEPARTMENT_REPOSITORY, HOSPITAL_REPOSITORY } from '../../application/ports/tokens.js';
import { CreateDepartmentUseCase } from '../../application/use-cases/create-department/create-department.use-case.js';
import { CreateHospitalUseCase } from '../../application/use-cases/create-hospital/create-hospital.use-case.js';
import { GetPlatformKpisUseCase } from '../../application/use-cases/get-platform-kpis/get-platform-kpis.use-case.js';
import { GetVerificationHistoryUseCase } from '../../application/use-cases/get-verification-history/get-verification-history.use-case.js';
import { GetVerificationReviewQueueUseCase } from '../../application/use-cases/get-verification-review-queue/get-verification-review-queue.use-case.js';
import { ListDepartmentsUseCase } from '../../application/use-cases/list-departments/list-departments.use-case.js';
import { ListHospitalsUseCase } from '../../application/use-cases/list-hospitals/list-hospitals.use-case.js';
import { ListPaymentTransactionsForAdminUseCase } from '../../application/use-cases/list-payment-transactions-for-admin/list-payment-transactions-for-admin.use-case.js';
import { ReviewVerificationCaseUseCase } from '../../application/use-cases/review-verification-case/review-verification-case.use-case.js';
import { Department } from '../../domain/entities/department.entity.js';
import { Hospital } from '../../domain/entities/hospital.entity.js';
import type { DepartmentRepository } from '../../domain/repositories/department.repository.js';
import type { HospitalRepository } from '../../domain/repositories/hospital.repository.js';

import { AdministrationController } from './administration.controller.js';

const SUPER_ADMIN_TOKEN = 'valid-super-admin-token';
const DOCTOR_TOKEN = 'valid-doctor-token';

class FakeJwtSigner implements JwtSignerPort {
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    if (token === SUPER_ADMIN_TOKEN) {
      return { accountId: '99999999-9999-4999-8999-999999999999', role: AccountRole.SuperAdmin };
    }
    if (token === DOCTOR_TOKEN) {
      return { accountId: '88888888-8888-4888-8888-888888888888', role: AccountRole.Doctor };
    }
    throw new Error('invalid token');
  }
}

class InMemoryAccountRepository implements AccountRepository {
  private readonly byId = new Map<string, Account>();

  constructor(seed: Account[] = []) {
    for (const account of seed) this.byId.set(account.getId().toString(), account);
  }

  async findById(id: { toString(): string }): Promise<Account | null> {
    return this.byId.get(id.toString()) ?? null;
  }

  async findByEmail(email: EmailAddress): Promise<Account | null> {
    for (const account of this.byId.values()) {
      if (account.getEmail().equals(email)) return account;
    }
    return null;
  }

  async findAll(options: ListAccountsOptions): Promise<{ accounts: Account[]; total: number }> {
    const all = [...this.byId.values()].filter((a) => !options.role || a.getRole() === options.role);
    return { accounts: all.slice(options.offset, options.offset + options.limit), total: all.length };
  }

  async save(account: Account): Promise<void> {
    this.byId.set(account.getId().toString(), account);
  }
}

class InMemoryHospitalRepository implements HospitalRepository {
  private readonly byId = new Map<string, Hospital>();

  async findAll(): Promise<Hospital[]> {
    return [...this.byId.values()];
  }

  async findById(id: string): Promise<Hospital | null> {
    return this.byId.get(id) ?? null;
  }

  async save(hospital: Hospital): Promise<void> {
    this.byId.set(hospital.getId(), hospital);
  }
}

class InMemoryDepartmentRepository implements DepartmentRepository {
  private readonly all: Department[] = [];

  async findAllByHospitalId(hospitalId: string): Promise<Department[]> {
    return this.all.filter((d) => d.getHospitalId() === hospitalId);
  }

  async save(department: Department): Promise<void> {
    this.all.push(department);
  }
}

class InMemoryVerificationCaseRepository implements VerificationCaseRepository {
  private readonly byId = new Map<string, VerificationCase>();

  async findById(id: string): Promise<VerificationCase | null> {
    return this.byId.get(id) ?? null;
  }
  async findPendingReview(_subjectType?: VerificationSubjectType, status?: VerificationStatus): Promise<VerificationCase[]> {
    const all = [...this.byId.values()];
    if (status) return all.filter((c) => c.getStatus() === status);
    const pendingStatuses: VerificationStatus[] = [
      VerificationStatus.Submitted,
      VerificationStatus.UnderReview,
      VerificationStatus.MoreInfoNeeded,
    ];
    return all.filter((c) => pendingStatuses.includes(c.getStatus()));
  }

  findAllBySubject(_subjectType: VerificationSubjectType, subjectAccountId: string): Promise<VerificationCase[]> {
    return Promise.resolve([...this.byId.values()].filter((c) => c.getSubjectAccountId() === subjectAccountId));
  }
  async save(verificationCase: VerificationCase): Promise<void> {
    this.byId.set(verificationCase.getId(), verificationCase);
  }

  seed(verificationCase: VerificationCase): void {
    this.byId.set(verificationCase.getId(), verificationCase);
  }
}

class InMemoryPatientProfileRepository implements PatientProfileRepository {
  private readonly byId = new Map<string, PatientProfile>();

  async findById(id: string): Promise<PatientProfile | null> {
    return this.byId.get(id) ?? null;
  }
  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    for (const profile of this.byId.values()) {
      if (profile.getAccountId() === accountId) return profile;
    }
    return null;
  }
  async save(profile: PatientProfile): Promise<void> {
    this.byId.set(profile.getId(), profile);
  }
}

class InMemoryDoctorProfileRepository implements DoctorProfileRepository {
  private readonly byId = new Map<string, DoctorProfile>();

  async findById(id: string): Promise<DoctorProfile | null> {
    return this.byId.get(id) ?? null;
  }
  async findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    for (const profile of this.byId.values()) {
      if (profile.getAccountId() === accountId) return profile;
    }
    return null;
  }
  async save(profile: DoctorProfile): Promise<void> {
    this.byId.set(profile.getId(), profile);
  }
}

class InMemoryPaymentTransactionRepository implements PaymentTransactionRepository {
  private readonly byId = new Map<string, PaymentTransaction>();

  async findById(id: string): Promise<PaymentTransaction | null> {
    return this.byId.get(id) ?? null;
  }
  async findByIdempotencyKey(): Promise<PaymentTransaction | null> {
    return null;
  }
  async findByExternalReference(): Promise<PaymentTransaction | null> {
    return null;
  }
  async findByConsultationSessionId(): Promise<PaymentTransaction | null> {
    return null;
  }
  async findByAppointmentId(): Promise<PaymentTransaction | null> {
    return null;
  }
  async findAll(options: { limit: number; offset: number }): Promise<{ transactions: PaymentTransaction[]; total: number }> {
    const all = [...this.byId.values()].sort((a, b) => b.getCreatedAt().getTime() - a.getCreatedAt().getTime());
    return { transactions: all.slice(options.offset, options.offset + options.limit), total: all.length };
  }
  async save(transaction: PaymentTransaction): Promise<void> {
    this.byId.set(transaction.getId(), transaction);
  }

  seed(transaction: PaymentTransaction): void {
    this.byId.set(transaction.getId(), transaction);
  }
}

class FakePaymentGateway implements PaymentGatewayPort {
  public refundCallCount = 0;
  async authorize(): Promise<never> {
    throw new Error('not used in this test');
  }
  async refund(_request: RefundPaymentRequest): Promise<RefundPaymentResult> {
    this.refundCallCount += 1;
    return { succeeded: true };
  }
}

class InMemorySecurityEventRepository implements SecurityEventRepository {
  async record(): Promise<void> {}
  async findByAccountId(): Promise<SecurityEvent[]> {
    return [];
  }
}

class NoopDomainEventDispatcher {
  async dispatch(): Promise<void> {}
  subscribe(): void {}
}

// Bare, hand-written stand-in for @nestjs/config's ConfigService --
// AdministrationController only ever calls .get(key, { infer: true }), so
// this fake needs no real ConfigModule wiring, matching this test suite's
// no-mocking-library convention.
class FakeConfigService {
  private readonly values: Record<string, unknown> = {
    OTEL_ENABLED: false,
    OPENAPI_ENABLED: true,
  };

  get(key: string): unknown {
    return this.values[key];
  }
}

function buildSucceededTransaction(props: {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  externalReference?: string;
}): PaymentTransaction {
  const transaction = PaymentTransaction.initiate({
    idempotencyKey: `idem-${props.appointmentId}`,
    appointmentId: props.appointmentId,
    patientId: props.patientId,
    doctorId: props.doctorId,
    amount: Money.create(500, 'EGP'),
    paymentMethod: PaymentMethod.Card,
  });
  transaction.attachExternalReference(props.externalReference ?? `pi_${props.appointmentId}`);
  transaction.markSucceeded();
  transaction.releaseDomainEvents();
  return transaction;
}

function buildDoctorAccount(): Account {
  const account = Account.register({
    email: EmailAddress.create('doctor-to-promote@example.com'),
    role: AccountRole.Doctor,
    displayName: DisplayName.create('Dr. Promotable'),
  });
  account.releaseDomainEvents();
  return account;
}

describe('AdministrationController (integration)', () => {
  let app: INestApplication;
  let verificationCaseRepository: InMemoryVerificationCaseRepository;
  let paymentTransactionRepository: InMemoryPaymentTransactionRepository;
  let paymentGateway: FakePaymentGateway;
  let seededPatientProfileId: string;
  let seededDoctorProfileId: string;

  before(async () => {
    const paymentPatientAccount = Account.register({
      email: EmailAddress.create('payment-patient@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Youssef Ibrahim'),
    });
    paymentPatientAccount.releaseDomainEvents();
    const paymentDoctorAccount = Account.register({
      email: EmailAddress.create('payment-doctor@example.com'),
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Dr. Amina Hassan'),
    });
    paymentDoctorAccount.releaseDomainEvents();

    const accountRepository = new InMemoryAccountRepository([buildDoctorAccount(), paymentPatientAccount, paymentDoctorAccount]);
    const hospitalRepository = new InMemoryHospitalRepository();
    const departmentRepository = new InMemoryDepartmentRepository();
    verificationCaseRepository = new InMemoryVerificationCaseRepository();
    const securityEventRepository = new InMemorySecurityEventRepository();
    const dispatcher = new NoopDomainEventDispatcher();

    const patientProfileRepository = new InMemoryPatientProfileRepository();
    const patientProfile = PatientProfile.create({ accountId: paymentPatientAccount.getId().toString() });
    patientProfile.releaseDomainEvents();
    await patientProfileRepository.save(patientProfile);
    seededPatientProfileId = patientProfile.getId();

    const doctorProfileRepository = new InMemoryDoctorProfileRepository();
    const doctorProfile = DoctorProfile.register({
      accountId: paymentDoctorAccount.getId().toString(),
      licenseNumber: 'LIC-ADMIN-PAYMENTS-1',
      specialtyId: 'specialty-cardiology',
    });
    doctorProfile.releaseDomainEvents();
    await doctorProfileRepository.save(doctorProfile);
    seededDoctorProfileId = doctorProfile.getId();

    paymentTransactionRepository = new InMemoryPaymentTransactionRepository();
    paymentTransactionRepository.seed(
      buildSucceededTransaction({
        appointmentId: '11111111-2222-4222-8222-222222222222',
        patientId: seededPatientProfileId,
        doctorId: seededDoctorProfileId,
      }),
    );
    paymentGateway = new FakePaymentGateway();

    const moduleRef = await Test.createTestingModule({
      controllers: [AdministrationController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        { provide: ConfigService, useClass: FakeConfigService },
        { provide: JWT_SIGNER, useClass: FakeJwtSigner },
        { provide: ACCOUNT_REPOSITORY, useValue: accountRepository },
        { provide: HOSPITAL_REPOSITORY, useValue: hospitalRepository },
        { provide: DEPARTMENT_REPOSITORY, useValue: departmentRepository },
        { provide: PATIENT_PROFILE_REPOSITORY, useValue: patientProfileRepository },
        { provide: DOCTOR_PROFILE_REPOSITORY, useValue: doctorProfileRepository },
        { provide: PAYMENT_TRANSACTION_REPOSITORY, useValue: paymentTransactionRepository },
        { provide: PAYMENT_GATEWAY, useValue: paymentGateway },
        { provide: DOMAIN_EVENT_DISPATCHER, useValue: dispatcher },
        { provide: ListAccountsUseCase, useFactory: () => new ListAccountsUseCase(accountRepository) },
        {
          provide: GetAccountByIdUseCase,
          useFactory: () => new GetAccountByIdUseCase(accountRepository),
        },
        {
          provide: GetPatientProfileByIdUseCase,
          useFactory: () => new GetPatientProfileByIdUseCase(patientProfileRepository),
        },
        {
          provide: GetDoctorProfileByIdUseCase,
          useFactory: () => new GetDoctorProfileByIdUseCase(doctorProfileRepository),
        },
        {
          provide: ListPaymentTransactionsUseCase,
          useFactory: () => new ListPaymentTransactionsUseCase(paymentTransactionRepository),
        },
        {
          provide: ListPaymentTransactionsForAdminUseCase,
          useFactory: (
            listPaymentTransactions: ListPaymentTransactionsUseCase,
            getPatientProfileById: GetPatientProfileByIdUseCase,
            getDoctorProfileById: GetDoctorProfileByIdUseCase,
            getAccountById: GetAccountByIdUseCase,
          ) =>
            new ListPaymentTransactionsForAdminUseCase(
              listPaymentTransactions,
              getPatientProfileById,
              getDoctorProfileById,
              getAccountById,
            ),
          inject: [ListPaymentTransactionsUseCase, GetPatientProfileByIdUseCase, GetDoctorProfileByIdUseCase, GetAccountByIdUseCase],
        },
        {
          provide: RefundPaymentUseCase,
          useFactory: () => new RefundPaymentUseCase(paymentTransactionRepository, paymentGateway, dispatcher),
        },
        {
          provide: UpdateAccountRoleUseCase,
          useFactory: () => new UpdateAccountRoleUseCase(accountRepository, dispatcher),
        },
        { provide: ListHospitalsUseCase, useFactory: () => new ListHospitalsUseCase(hospitalRepository) },
        { provide: CreateHospitalUseCase, useFactory: () => new CreateHospitalUseCase(hospitalRepository) },
        {
          provide: ListDepartmentsUseCase,
          useFactory: () => new ListDepartmentsUseCase(hospitalRepository, departmentRepository),
        },
        {
          provide: CreateDepartmentUseCase,
          useFactory: () => new CreateDepartmentUseCase(hospitalRepository, departmentRepository),
        },
        {
          provide: GetPlatformKpisUseCase,
          useFactory: (listAccounts: ListAccountsUseCase) => new GetPlatformKpisUseCase(listAccounts, hospitalRepository),
          inject: [ListAccountsUseCase],
        },
        {
          provide: ListPendingVerificationCasesUseCase,
          useFactory: () => new ListPendingVerificationCasesUseCase(verificationCaseRepository),
        },
        {
          provide: GetVerificationReviewQueueUseCase,
          useFactory: (q: ListPendingVerificationCasesUseCase) => new GetVerificationReviewQueueUseCase(q),
          inject: [ListPendingVerificationCasesUseCase],
        },
        {
          provide: DecideVerificationUseCase,
          useFactory: () => new DecideVerificationUseCase(verificationCaseRepository, dispatcher),
        },
        {
          provide: ReviewVerificationCaseUseCase,
          useFactory: (d: DecideVerificationUseCase) => new ReviewVerificationCaseUseCase(d),
          inject: [DecideVerificationUseCase],
        },
        {
          provide: SuspendVerificationCaseUseCase,
          useFactory: () => new SuspendVerificationCaseUseCase(verificationCaseRepository, dispatcher),
        },
        {
          provide: GetVerificationCaseByIdUseCase,
          useFactory: () => new GetVerificationCaseByIdUseCase(verificationCaseRepository),
        },
        {
          provide: ListVerificationCasesForSubjectUseCase,
          useFactory: () => new ListVerificationCasesForSubjectUseCase(verificationCaseRepository),
        },
        {
          provide: GetVerificationHistoryUseCase,
          useFactory: (
            getById: GetVerificationCaseByIdUseCase,
            listForSubject: ListVerificationCasesForSubjectUseCase,
          ) => new GetVerificationHistoryUseCase(getById, listForSubject),
          inject: [GetVerificationCaseByIdUseCase, ListVerificationCasesForSubjectUseCase],
        },
        {
          provide: ListSecurityEventsForAccountUseCase,
          useFactory: () => new ListSecurityEventsForAccountUseCase(securityEventRepository),
        },
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

  it('GET /admin/kpis rejects a request with no bearer token', async () => {
    await request(app.getHttpServer()).get('/admin/kpis').expect(401);
  });

  it('GET /admin/kpis rejects a non-SuperAdmin caller with 403', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/kpis')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(403);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  it('GET /admin/kpis returns identity-owned counts', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/kpis')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);

    // 2 doctors, 1 patient: 'doctor-to-promote@example.com' plus this
    // suite's own payment-admin fixture accounts (paymentDoctorAccount,
    // paymentPatientAccount), seeded to give GET /admin/payments a real
    // patient/doctor name pair to resolve.
    assert.equal(response.body.data.activeDoctorCount, 2);
    assert.equal(response.body.data.activePatientCount, 1);
    assert.equal(response.body.data.hospitalCount, 0);
  });

  it('GET /admin/accounts lists accounts with pagination metadata', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/accounts?role=doctor')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.total, 2);
    assert.ok(response.body.data.accounts.some((account: { email: string }) => account.email === 'doctor-to-promote@example.com'));
  });

  it('PATCH /admin/accounts/:id/role changes an account role', async () => {
    const list = await request(app.getHttpServer())
      .get('/admin/accounts?role=doctor')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);
    const accountId = list.body.data.accounts[0].id;

    const response = await request(app.getHttpServer())
      .patch(`/admin/accounts/${accountId}/role`)
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .send({ role: 'nurse' })
      .expect(200);

    assert.equal(response.body.data.role, 'nurse');
  });

  it('PATCH /admin/accounts/:id/role returns 404 for an unknown account', async () => {
    const response = await request(app.getHttpServer())
      .patch('/admin/accounts/11111111-1111-4111-8111-111111111111/role')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .send({ role: 'nurse' })
      .expect(404);
    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('POST /admin/hospitals creates a hospital, then GET /admin/hospitals lists it', async () => {
    const created = await request(app.getHttpServer())
      .post('/admin/hospitals')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .send({ name: 'Cairo General Hospital' })
      .expect(201);

    assert.equal(created.body.data.name, 'Cairo General Hospital');

    const list = await request(app.getHttpServer())
      .get('/admin/hospitals')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);

    assert.equal(list.body.data.length, 1);
  });

  it('POST /admin/hospitals/:id/departments creates a department under an existing hospital', async () => {
    const hospital = await request(app.getHttpServer())
      .post('/admin/hospitals')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .send({ name: 'Alexandria Medical Center' })
      .expect(201);

    const department = await request(app.getHttpServer())
      .post(`/admin/hospitals/${hospital.body.data.id}/departments`)
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .send({ name: 'Cardiology' })
      .expect(201);

    assert.equal(department.body.data.name, 'Cardiology');
    assert.equal(department.body.data.hospitalId, hospital.body.data.id);
  });

  it('POST /admin/hospitals/:id/departments returns 404 for an unknown hospital', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/hospitals/11111111-1111-4111-8111-111111111111/departments')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .send({ name: 'Cardiology' })
      .expect(404);
    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('GET /admin/verification-queue returns an empty queue', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/verification-queue')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);
    assert.deepEqual(response.body.data, []);
  });

  // Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8).
  it('GET /admin/verification-queue includes documentAssetIds for real admin review', async () => {
    const doctorCase = VerificationCase.submit({
      subjectAccountId: '33333333-3333-4333-8333-333333333333',
      subjectDetails: DoctorProfessionalDetails.create('LIC-9001', 'cardiology'),
      documentAssetIds: ['44444444-4444-4444-8444-444444444444'],
    });
    verificationCaseRepository.seed(doctorCase);

    const response = await request(app.getHttpServer())
      .get('/admin/verification-queue')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);

    const found = response.body.data.find((c: { id: string }) => c.id === doctorCase.getId());
    assert.ok(found, 'expected the seeded case in the queue');
    assert.deepEqual(found.documentAssetIds, ['44444444-4444-4444-8444-444444444444']);
    assert.equal(found.subjectType, 'doctor');
    assert.equal(found.licenseNumber, 'LIC-9001');
  });

  it('GET /admin/verification-queue?status=approved finds an Approved case, invisible in the default pending view', async () => {
    const approvedCase = VerificationCase.submit({
      subjectAccountId: '55555555-5555-4555-8555-555555555555',
      subjectDetails: PatientIdentityDetails.create(),
      documentAssetIds: ['66666666-6666-4666-8666-666666666666'],
    });
    approvedCase.decide(VerificationStatus.Approved);
    verificationCaseRepository.seed(approvedCase);

    const defaultQueue = await request(app.getHttpServer())
      .get('/admin/verification-queue')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);
    assert.ok(!defaultQueue.body.data.some((c: { id: string }) => c.id === approvedCase.getId()));

    const approvedQueue = await request(app.getHttpServer())
      .get('/admin/verification-queue?status=approved')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);
    assert.ok(approvedQueue.body.data.some((c: { id: string }) => c.id === approvedCase.getId()));
  });

  it('GET /admin/verification-queue/:id returns the full case detail', async () => {
    const patientCase = VerificationCase.submit({
      subjectAccountId: '77777777-7777-4777-8777-777777777777',
      subjectDetails: PatientIdentityDetails.create(),
      documentAssetIds: ['88888888-8888-4888-8888-888888888888'],
    });
    verificationCaseRepository.seed(patientCase);

    const response = await request(app.getHttpServer())
      .get(`/admin/verification-queue/${patientCase.getId()}`)
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.id, patientCase.getId());
    assert.equal(response.body.data.subjectType, 'patient');
    assert.deepEqual(response.body.data.documentAssetIds, ['88888888-8888-4888-8888-888888888888']);
  });

  it('GET /admin/verification-queue/:id returns 404 for an unknown case', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/verification-queue/99999999-9999-4999-8999-999999999999')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(404);
    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('GET /admin/verification-queue/:id rejects a non-SuperAdmin caller with 403', async () => {
    const patientCase = VerificationCase.submit({
      subjectAccountId: '11111111-1111-4111-8111-111111111112',
      subjectDetails: PatientIdentityDetails.create(),
      documentAssetIds: ['22222222-2222-4222-8222-222222222223'],
    });
    verificationCaseRepository.seed(patientCase);

    await request(app.getHttpServer())
      .get(`/admin/verification-queue/${patientCase.getId()}`)
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(403);
  });

  it('GET /admin/accounts/:id/security-events returns an empty audit log for an account', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/accounts/99999999-9999-4999-8999-999999999999/security-events')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);
    assert.deepEqual(response.body.data, []);
  });

  it('GET /admin/feature-flags reports provider configuration booleans', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/feature-flags')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);

    assert.equal(typeof response.body.data.observabilityEnabled, 'boolean');
    assert.equal(typeof response.body.data.paymentGatewayConfigured, 'boolean');
  });

  // ORIVEX Roadmap Phase 3, Critical Lifecycle Gaps, Step 4.
  it('GET /admin/payments rejects a request with no bearer token', async () => {
    await request(app.getHttpServer()).get('/admin/payments').expect(401);
  });

  it('GET /admin/payments rejects a non-SuperAdmin caller with 403', async () => {
    await request(app.getHttpServer())
      .get('/admin/payments')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(403);
  });

  it('GET /admin/payments lists transactions with resolved patient/doctor names', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/payments')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.total, 1);
    assert.equal(response.body.data.transactions.length, 1);
    assert.equal(response.body.data.transactions[0].patientName, 'Youssef Ibrahim');
    assert.equal(response.body.data.transactions[0].doctorName, 'Dr. Amina Hassan');
    assert.equal(response.body.data.transactions[0].status, 'succeeded');
    assert.equal(response.body.data.transactions[0].amount.currency, 'EGP');
  });

  it('POST /admin/payments/:id/refund rejects a non-SuperAdmin caller with 403, without touching the gateway', async () => {
    const before = paymentGateway.refundCallCount;
    await request(app.getHttpServer())
      .post('/admin/payments/11111111-1111-4111-8111-111111111111/refund')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(403);
    assert.equal(paymentGateway.refundCallCount, before);
  });

  it('POST /admin/payments/:id/refund rejects an unauthenticated caller', async () => {
    await request(app.getHttpServer()).post('/admin/payments/11111111-1111-4111-8111-111111111111/refund').expect(401);
  });

  it('POST /admin/payments/:id/refund returns 404 for an unknown transaction', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/payments/99999999-9999-4999-8999-999999999998/refund')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(404);
    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('POST /admin/payments/:id/refund refunds a Succeeded transaction as SuperAdmin, calling the real gateway', async () => {
    const transaction = buildSucceededTransaction({
      appointmentId: '33333333-4444-4444-8444-444444444444',
      patientId: seededPatientProfileId,
      doctorId: seededDoctorProfileId,
      externalReference: 'pi_admin_refund_1',
    });
    paymentTransactionRepository.seed(transaction);
    const gatewayCallsBefore = paymentGateway.refundCallCount;

    const response = await request(app.getHttpServer())
      .post(`/admin/payments/${transaction.getId()}/refund`)
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.status, 'refunded');
    assert.equal(paymentGateway.refundCallCount, gatewayCallsBefore + 1);
  });

  it('POST /admin/payments/:id/refund returns a clean error for an already-refunded transaction, without a second gateway call', async () => {
    const transaction = buildSucceededTransaction({
      appointmentId: '55555555-6666-4666-8666-666666666666',
      patientId: seededPatientProfileId,
      doctorId: seededDoctorProfileId,
      externalReference: 'pi_admin_refund_2',
    });
    paymentTransactionRepository.seed(transaction);

    await request(app.getHttpServer())
      .post(`/admin/payments/${transaction.getId()}/refund`)
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);
    const gatewayCallsAfterFirstRefund = paymentGateway.refundCallCount;

    const response = await request(app.getHttpServer())
      .post(`/admin/payments/${transaction.getId()}/refund`)
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(422);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
    assert.equal(paymentGateway.refundCallCount, gatewayCallsAfterFirstRefund, 'a rejected re-refund must never reach the gateway a second time');
  });
});
