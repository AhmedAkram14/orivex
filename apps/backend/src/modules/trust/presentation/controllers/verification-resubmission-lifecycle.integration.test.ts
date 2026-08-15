import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { Reflector } from '@nestjs/core';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { InProcessDomainEventDispatcher } from '../../../../platform/events/in-process-domain-event-dispatcher.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../../../shared/domain/tokens.js';
import type { AccessTokenClaims, JwtSignerPort } from '../../../authentication/application/ports/jwt-signer.port.js';
import { JWT_SIGNER } from '../../../authentication/application/ports/tokens.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { PromoteDoctorRoleOnVerificationHandler } from '../../../doctor/application/event-handlers/promote-doctor-role-on-verification.handler.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { ACCOUNT_REPOSITORY } from '../../../identity/application/ports/tokens.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { UpdateAccountRoleUseCase } from '../../../identity/application/use-cases/update-account-role/update-account-role.use-case.js';
import { Account } from '../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository, ListAccountsOptions } from '../../../identity/domain/repositories/account.repository.js';
import { DisplayName } from '../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../identity/domain/value-objects/email-address.value-object.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PATIENT_PROFILE_REPOSITORY } from '../../../patient/application/ports/tokens.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import { VERIFICATION_CASE_REPOSITORY } from '../../application/ports/tokens.js';
import { CheckIdentityVerificationStatusUseCase } from '../../application/use-cases/check-identity-verification-status/check-identity-verification-status.use-case.js';
import { GetVerificationCaseByIdUseCase } from '../../application/use-cases/get-verification-case-by-id/get-verification-case-by-id.use-case.js';
import { ListVerificationCasesForSubjectUseCase } from '../../application/use-cases/list-verification-cases-for-subject/list-verification-cases-for-subject.use-case.js';
import { SubmitDoctorVerificationUseCase } from '../../application/use-cases/submit-doctor-verification/submit-doctor-verification.use-case.js';
import { SubmitPatientVerificationUseCase } from '../../application/use-cases/submit-patient-verification/submit-patient-verification.use-case.js';
import type { VerificationCase } from '../../domain/entities/verification-case.entity.js';
import type { VerificationSubjectType } from '../../domain/enums/verification-subject-type.enum.js';
import type { VerificationCaseRepository } from '../../domain/repositories/verification-case.repository.js';
import { DecideVerificationUseCase } from '../../application/use-cases/decide-verification/decide-verification.use-case.js';
import { GetVerificationHistoryUseCase } from '../../../administration/application/use-cases/get-verification-history/get-verification-history.use-case.js';
import { GetVerificationReviewQueueUseCase } from '../../../administration/application/use-cases/get-verification-review-queue/get-verification-review-queue.use-case.js';
import { ListPendingVerificationCasesUseCase } from '../../application/use-cases/list-pending-verification-cases/list-pending-verification-cases.use-case.js';
import { ReviewVerificationCaseUseCase } from '../../../administration/application/use-cases/review-verification-case/review-verification-case.use-case.js';
import { SuspendVerificationCaseUseCase } from '../../application/use-cases/suspend-verification-case/suspend-verification-case.use-case.js';
import { ListSecurityEventsForAccountUseCase } from '../../application/use-cases/list-security-events-for-account/list-security-events-for-account.use-case.js';
import { ListAccountsUseCase } from '../../../identity/application/use-cases/list-accounts/list-accounts.use-case.js';
import { ListHospitalsUseCase } from '../../../administration/application/use-cases/list-hospitals/list-hospitals.use-case.js';
import { CreateHospitalUseCase } from '../../../administration/application/use-cases/create-hospital/create-hospital.use-case.js';
import { ListDepartmentsUseCase } from '../../../administration/application/use-cases/list-departments/list-departments.use-case.js';
import { CreateDepartmentUseCase } from '../../../administration/application/use-cases/create-department/create-department.use-case.js';
import { GetPlatformKpisUseCase } from '../../../administration/application/use-cases/get-platform-kpis/get-platform-kpis.use-case.js';
import { DEPARTMENT_REPOSITORY, HOSPITAL_REPOSITORY } from '../../../administration/application/ports/tokens.js';
import { Department } from '../../../administration/domain/entities/department.entity.js';
import { Hospital } from '../../../administration/domain/entities/hospital.entity.js';
import type { DepartmentRepository } from '../../../administration/domain/repositories/department.repository.js';
import type { HospitalRepository } from '../../../administration/domain/repositories/hospital.repository.js';
import type { SecurityEvent } from '../../domain/entities/security-event.entity.js';
import type { SecurityEventRepository } from '../../domain/repositories/security-event.repository.js';
import { AdministrationController } from '../../../administration/presentation/controllers/administration.controller.js';
import { ListPaymentTransactionsForAdminUseCase } from '../../../administration/application/use-cases/list-payment-transactions-for-admin/list-payment-transactions-for-admin.use-case.js';
import { PAYMENT_GATEWAY, PAYMENT_TRANSACTION_REPOSITORY } from '../../../payment/application/ports/tokens.js';
import type { PaymentGatewayPort, RefundPaymentRequest, RefundPaymentResult } from '../../../payment/application/ports/payment-gateway.port.js';
import { ListPaymentTransactionsUseCase } from '../../../payment/application/use-cases/list-payment-transactions/list-payment-transactions.use-case.js';
import { RefundPaymentUseCase } from '../../../payment/application/use-cases/refund-payment/refund-payment.use-case.js';
import type { PaymentTransaction } from '../../../payment/domain/entities/payment-transaction.entity.js';
import type { PaymentTransactionRepository } from '../../../payment/domain/repositories/payment-transaction.repository.js';

import { DoctorVerificationController } from './doctor-verification.controller.js';
import { PatientVerificationController } from './patient-verification.controller.js';

// ORIVEX Roadmap Phase 3, Step 3: proves the full applicant-facing
// resubmission lifecycle end-to-end, chaining stages that today are only
// covered in isolation across separate test files (submit, decide, suspend,
// history, promotion, gate-check). Confirmed ground truth (see each
// use-case's own comments): resubmission is NOT a distinct use case --
// SubmitDoctorVerificationUseCase/SubmitPatientVerificationUseCase
// unconditionally create a brand-new VerificationCase with a new id every
// call. This file drives that behavior through the real HTTP controllers,
// with a *real* InProcessDomainEventDispatcher (not a Noop stub) so that
// DoctorVerifiedEvent -> PromoteDoctorRoleOnVerificationHandler role
// promotion is proven to actually happen, not merely asserted as "an event
// was dispatched".

const DOCTOR_TOKEN = 'valid-doctor-token';
const ADMIN_TOKEN = 'valid-admin-super-token';
const PATIENT_TOKEN = 'valid-patient-token';

class InMemoryDoctorProfileRepository implements DoctorProfileRepository {
  private readonly byId = new Map<string, DoctorProfile>();
  private readonly byAccountId = new Map<string, DoctorProfile>();
  add(profile: DoctorProfile): void {
    this.byId.set(profile.getId(), profile);
    this.byAccountId.set(profile.getAccountId(), profile);
  }
  async findById(id: string): Promise<DoctorProfile | null> {
    return this.byId.get(id) ?? null;
  }
  async findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    return this.byAccountId.get(accountId) ?? null;
  }
  async save(): Promise<void> {}
}

class InMemoryPatientProfileRepository implements PatientProfileRepository {
  private readonly byId = new Map<string, PatientProfile>();
  private readonly byAccountId = new Map<string, PatientProfile>();
  add(profile: PatientProfile): void {
    this.byId.set(profile.getId(), profile);
    this.byAccountId.set(profile.getAccountId(), profile);
  }
  async findById(id: string): Promise<PatientProfile | null> {
    return this.byId.get(id) ?? null;
  }
  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    return this.byAccountId.get(accountId) ?? null;
  }
  async save(): Promise<void> {}
}

// Sorts most-recently-submitted-first, exactly like the real Prisma
// repository's documented contract (relied on by
// CheckIdentityVerificationStatusUseCase, which reads cases[0] as "current
// standing" -- trust.controller.integration.test.ts's own in-memory fake
// makes the same choice for the same reason).
class InMemoryVerificationCaseRepository implements VerificationCaseRepository {
  private readonly byId = new Map<string, VerificationCase>();
  async findById(id: string): Promise<VerificationCase | null> {
    return this.byId.get(id) ?? null;
  }
  async findPendingReview(): Promise<VerificationCase[]> {
    return [...this.byId.values()];
  }
  async findAllBySubject(subjectType: VerificationSubjectType, subjectAccountId: string): Promise<VerificationCase[]> {
    return [...this.byId.values()]
      .filter(
        (verificationCase) =>
          verificationCase.getSubjectType() === subjectType && verificationCase.getSubjectAccountId() === subjectAccountId,
      )
      .sort((a, b) => b.getSubmittedAt().getTime() - a.getSubmittedAt().getTime());
  }
  async save(verificationCase: VerificationCase): Promise<void> {
    this.byId.set(verificationCase.getId(), verificationCase);
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

class InMemorySecurityEventRepository implements SecurityEventRepository {
  async record(): Promise<void> {}
  async findByAccountId(): Promise<SecurityEvent[]> {
    return [];
  }
}

class FakeConfigService {
  private readonly values: Record<string, unknown> = { OTEL_ENABLED: false, OPENAPI_ENABLED: true };
  get(key: string): unknown {
    return this.values[key];
  }
}

// This suite never exercises AdministrationController's payment routes
// (GET /admin/payments, POST /admin/payments/:id/refund) -- only wires
// their dependencies because AdministrationController now needs them to
// instantiate at all. Always empty/no-op.
class InMemoryPaymentTransactionRepository implements PaymentTransactionRepository {
  async findById(): Promise<PaymentTransaction | null> {
    return null;
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
  async findAll(): Promise<{ transactions: PaymentTransaction[]; total: number }> {
    return { transactions: [], total: 0 };
  }
  async save(): Promise<void> {}
}

class FakePaymentGateway implements PaymentGatewayPort {
  async authorize(): Promise<never> {
    throw new Error('not used in this test');
  }
  async refund(_request: RefundPaymentRequest): Promise<RefundPaymentResult> {
    return { succeeded: true };
  }
}

describe('Verification resubmission lifecycle (integration)', () => {
  let app: INestApplication;
  let doctorProfile: DoctorProfile;
  let doctorAccountId: string;
  let patientProfile: PatientProfile;
  let patientAccountId: string;
  let accountRepository: InMemoryAccountRepository;
  let doctorProfileRepository: InMemoryDoctorProfileRepository;
  let extraDoctorTokens: Map<string, string>;

  before(async () => {
    // Create the doctor's Account first so its real id can back both the
    // DoctorProfile and the JWT claims -- UpdateAccountRoleUseCase (invoked
    // by the real promotion handler below) requires a genuinely persisted
    // Account to promote, not just a profile.
    const doctorAccount = Account.register({
      email: EmailAddress.create('resubmission-doctor@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Dr. Resubmitter'),
    });
    doctorAccount.releaseDomainEvents();
    doctorAccountId = doctorAccount.getId().toString();

    doctorProfile = DoctorProfile.register({
      accountId: doctorAccountId,
      licenseNumber: 'LIC-RESUB-1',
      specialtyId: '11111111-1111-4111-8111-111111111111',
    });
    doctorProfileRepository = new InMemoryDoctorProfileRepository();
    doctorProfileRepository.add(doctorProfile);
    extraDoctorTokens = new Map<string, string>();

    patientProfile = PatientProfile.create({ accountId: '22222222-2222-4222-8222-222222222222' });
    patientAccountId = patientProfile.getAccountId();
    const patientProfileRepository = new InMemoryPatientProfileRepository();
    patientProfileRepository.add(patientProfile);

    accountRepository = new InMemoryAccountRepository([doctorAccount]);
    const hospitalRepository = new InMemoryHospitalRepository();
    const departmentRepository = new InMemoryDepartmentRepository();
    const verificationCaseRepository = new InMemoryVerificationCaseRepository();
    const securityEventRepository = new InMemorySecurityEventRepository();

    // The one deliberate deviation from this suite's usual NoopDomainEventDispatcher
    // convention: a *real* dispatcher, with the real production subscription
    // wiring copied verbatim from doctor.module.ts, so that role promotion
    // is proven to actually happen end-to-end rather than merely asserting
    // "an event was queued".
    const dispatcher = new InProcessDomainEventDispatcher();

    class FakeJwtSigner implements JwtSignerPort {
      async sign(): Promise<never> {
        throw new Error('not used in this test');
      }
      async verify(token: string): Promise<AccessTokenClaims> {
        if (token === DOCTOR_TOKEN) return { accountId: doctorAccountId, role: AccountRole.Doctor };
        if (token === PATIENT_TOKEN) return { accountId: patientAccountId, role: AccountRole.Patient };
        if (token === ADMIN_TOKEN) {
          return { accountId: '99999999-9999-4999-8999-999999999999', role: AccountRole.SuperAdmin };
        }
        const extraAccountId = extraDoctorTokens.get(token);
        if (extraAccountId) return { accountId: extraAccountId, role: AccountRole.Doctor };
        throw new Error('invalid token');
      }
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [DoctorVerificationController, PatientVerificationController, AdministrationController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        { provide: ConfigService, useClass: FakeConfigService },
        { provide: JWT_SIGNER, useClass: FakeJwtSigner },
        { provide: VERIFICATION_CASE_REPOSITORY, useValue: verificationCaseRepository },
        { provide: PATIENT_PROFILE_REPOSITORY, useValue: patientProfileRepository },
        { provide: ACCOUNT_REPOSITORY, useValue: accountRepository },
        { provide: HOSPITAL_REPOSITORY, useValue: hospitalRepository },
        { provide: DEPARTMENT_REPOSITORY, useValue: departmentRepository },
        { provide: DOMAIN_EVENT_DISPATCHER, useValue: dispatcher },
        {
          provide: GetDoctorProfileByIdUseCase,
          useFactory: () => new GetDoctorProfileByIdUseCase(doctorProfileRepository),
        },
        {
          provide: GetDoctorProfileByAccountIdUseCase,
          useFactory: () => new GetDoctorProfileByAccountIdUseCase(doctorProfileRepository),
        },
        {
          provide: GetPatientProfileByIdUseCase,
          useFactory: () => new GetPatientProfileByIdUseCase(patientProfileRepository),
        },
        {
          provide: GetPatientProfileByAccountIdUseCase,
          useFactory: () => new GetPatientProfileByAccountIdUseCase(patientProfileRepository),
        },
        {
          provide: SubmitDoctorVerificationUseCase,
          useFactory: (getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase) =>
            new SubmitDoctorVerificationUseCase(verificationCaseRepository, dispatcher, getDoctorProfileByIdUseCase),
          inject: [GetDoctorProfileByIdUseCase],
        },
        {
          provide: SubmitPatientVerificationUseCase,
          useFactory: (getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase) =>
            new SubmitPatientVerificationUseCase(verificationCaseRepository, dispatcher, getPatientProfileByIdUseCase),
          inject: [GetPatientProfileByIdUseCase],
        },
        {
          provide: ListVerificationCasesForSubjectUseCase,
          useFactory: () => new ListVerificationCasesForSubjectUseCase(verificationCaseRepository),
        },
        {
          provide: CheckIdentityVerificationStatusUseCase,
          useFactory: () => new CheckIdentityVerificationStatusUseCase(verificationCaseRepository),
        },
        {
          provide: GetVerificationCaseByIdUseCase,
          useFactory: () => new GetVerificationCaseByIdUseCase(verificationCaseRepository),
        },
        {
          provide: GetVerificationHistoryUseCase,
          useFactory: (getById: GetVerificationCaseByIdUseCase, listForSubject: ListVerificationCasesForSubjectUseCase) =>
            new GetVerificationHistoryUseCase(getById, listForSubject),
          inject: [GetVerificationCaseByIdUseCase, ListVerificationCasesForSubjectUseCase],
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
          provide: ListSecurityEventsForAccountUseCase,
          useFactory: () => new ListSecurityEventsForAccountUseCase(securityEventRepository),
        },
        { provide: ListAccountsUseCase, useFactory: () => new ListAccountsUseCase(accountRepository) },
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
        { provide: PAYMENT_TRANSACTION_REPOSITORY, useValue: new InMemoryPaymentTransactionRepository() },
        { provide: PAYMENT_GATEWAY, useValue: new FakePaymentGateway() },
        {
          provide: GetAccountByIdUseCase,
          useFactory: () => new GetAccountByIdUseCase(accountRepository),
        },
        {
          provide: ListPaymentTransactionsUseCase,
          useFactory: (repository: PaymentTransactionRepository) => new ListPaymentTransactionsUseCase(repository),
          inject: [PAYMENT_TRANSACTION_REPOSITORY],
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
          useFactory: (repository: PaymentTransactionRepository, gateway: PaymentGatewayPort) =>
            new RefundPaymentUseCase(repository, gateway, dispatcher),
          inject: [PAYMENT_TRANSACTION_REPOSITORY, PAYMENT_GATEWAY],
        },
        {
          // Copied verbatim from doctor.module.ts's own factory: subscribes
          // the real promotion handler to the real dispatcher's
          // 'doctor.verified' channel exactly once, before any request is
          // served -- proving the production wiring, not a substitute for it.
          provide: PromoteDoctorRoleOnVerificationHandler,
          useFactory: (updateAccountRoleUseCase: UpdateAccountRoleUseCase, logger: PinoLoggerService) => {
            const handler = new PromoteDoctorRoleOnVerificationHandler(updateAccountRoleUseCase, logger);
            dispatcher.subscribe('doctor.verified', (event) =>
              handler.handle(event as unknown as { subjectAccountId: string; verificationCaseId: string }),
            );
            return handler;
          },
          inject: [UpdateAccountRoleUseCase, PinoLoggerService],
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

  describe('Doctor subject: Rejected -> resubmit -> Approved, with real role promotion', () => {
    let firstCaseId: string;
    let secondCaseId: string;

    it('submits credentials for review', async () => {
      const response = await request(app.getHttpServer())
        .post(`/doctors/${doctorProfile.getId()}/verifications`)
        .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
        .send({
          licenseNumber: 'LIC-RESUB-1',
          specialtyCode: 'cardiology',
          documentAssetIds: ['33333333-3333-4333-8333-333333333333'],
        })
        .expect(201);

      assert.equal(response.body.data.status, 'submitted');
      firstCaseId = response.body.data.id;
    });

    it('admin rejects the case with a reason', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/verification-queue/${firstCaseId}`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ status: 'rejected', reason: 'License document illegible' })
        .expect(200);

      assert.equal(response.body.data.status, 'rejected');
      assert.equal(response.body.data.reason, 'License document illegible');
    });

    it('applicant GET reflects rejected status and the reason', async () => {
      const response = await request(app.getHttpServer())
        .get(`/doctors/${doctorProfile.getId()}/verifications`)
        .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
        .expect(200);

      assert.equal(response.body.data[0].id, firstCaseId);
      assert.equal(response.body.data[0].status, 'rejected');
      assert.equal(response.body.data[0].reason, 'License document illegible');
    });

    it('applicant resubmits, creating a brand-new VerificationCase (different id)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/doctors/${doctorProfile.getId()}/verifications`)
        .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
        .send({
          licenseNumber: 'LIC-RESUB-1',
          specialtyCode: 'cardiology',
          documentAssetIds: ['44444444-4444-4444-8444-444444444444'],
        })
        .expect(201);

      assert.equal(response.body.data.status, 'submitted');
      secondCaseId = response.body.data.id;
      assert.notEqual(secondCaseId, firstCaseId, 'resubmission must create a new case id, not mutate the old one');
    });

    it("admin's history endpoint shows both the old rejected case and the new submitted case", async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/verification-queue/${secondCaseId}/history`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .expect(200);

      const ids = response.body.data.map((c: { id: string }) => c.id);
      assert.ok(ids.includes(firstCaseId), 'history must still include the original rejected case');
      assert.ok(ids.includes(secondCaseId), 'history must include the new resubmitted case');
      assert.equal(response.body.data.length, 2);

      const oldCase = response.body.data.find((c: { id: string }) => c.id === firstCaseId);
      const newCase = response.body.data.find((c: { id: string }) => c.id === secondCaseId);
      assert.equal(oldCase.status, 'rejected');
      assert.equal(newCase.status, 'submitted');
    });

    it('doctor is still Patient-role before approval (no premature promotion)', async () => {
      const account = await accountRepository.findById({ toString: () => doctorAccountId });
      assert.equal(account?.getRole(), AccountRole.Patient);
    });

    it('admin approves the new case -> final state is approved, and DoctorVerifiedEvent really promotes the role', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/verification-queue/${secondCaseId}`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ status: 'approved' })
        .expect(200);

      assert.equal(response.body.data.status, 'approved');

      // Proves the real production event-handler chain executed (not just
      // that an event object was constructed): DoctorVerifiedEvent ->
      // PromoteDoctorRoleOnVerificationHandler -> UpdateAccountRoleUseCase
      // -> Account.changeRole(Doctor) -> persisted.
      const promotedAccount = await accountRepository.findById({ toString: () => doctorAccountId });
      assert.equal(promotedAccount?.getRole(), AccountRole.Doctor, 'approval must actually promote the account to Doctor');
    });

    it('the old rejected case is untouched by the later approval of the new case', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/verification-queue/${firstCaseId}/history`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .expect(200);

      const oldCase = response.body.data.find((c: { id: string }) => c.id === firstCaseId);
      assert.equal(oldCase.status, 'rejected');
    });
  });

  describe('Doctor subject: MoreInfoNeeded -> resubmit -> Approved', () => {
    let doctorTwo: DoctorProfile;
    let doctorTwoAccountId: string;
    let firstCaseId: string;
    let secondCaseId: string;
    const DOCTOR_TWO_TOKEN = 'valid-doctor-two-token';

    before(async () => {
      // A second doctor identity, registered directly against the same
      // in-memory repositories the running app already holds (no separate
      // moduleRef needed -- this mirrors how trust.controller.integration.test.ts
      // reuses one `app` across multiple describe blocks).
      const account = Account.register({
        email: EmailAddress.create('resubmission-doctor-2@example.com'),
        role: AccountRole.Patient,
        displayName: DisplayName.create('Dr. MoreInfo'),
      });
      account.releaseDomainEvents();
      doctorTwoAccountId = account.getId().toString();
      await accountRepository.save(account);

      doctorTwo = DoctorProfile.register({
        accountId: doctorTwoAccountId,
        licenseNumber: 'LIC-RESUB-2',
        specialtyId: '11111111-1111-4111-8111-111111111111',
      });

      // Seed the same shared repository instance the running app's
      // DoctorVerificationController already resolves against (captured in
      // the outer `before`'s closure), then register this token so
      // FakeJwtSigner.verify can resolve it.
      doctorProfileRepository.add(doctorTwo);
      extraDoctorTokens.set(DOCTOR_TWO_TOKEN, doctorTwoAccountId);
    });

    it('submits, then admin requests more info, then applicant resubmits, then admin approves', async () => {
      const submitResponse = await request(app.getHttpServer())
        .post(`/doctors/${doctorTwo.getId()}/verifications`)
        .set('Authorization', `Bearer ${DOCTOR_TWO_TOKEN}`)
        .send({
          licenseNumber: 'LIC-RESUB-2',
          specialtyCode: 'cardiology',
          documentAssetIds: ['55555555-5555-4555-8555-555555555555'],
        })
        .expect(201);
      firstCaseId = submitResponse.body.data.id;

      const moreInfoResponse = await request(app.getHttpServer())
        .patch(`/admin/verification-queue/${firstCaseId}`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ status: 'more_info_needed', reason: 'Please attach the back of the license' })
        .expect(200);
      assert.equal(moreInfoResponse.body.data.status, 'more_info_needed');

      const resubmitResponse = await request(app.getHttpServer())
        .post(`/doctors/${doctorTwo.getId()}/verifications`)
        .set('Authorization', `Bearer ${DOCTOR_TWO_TOKEN}`)
        .send({
          licenseNumber: 'LIC-RESUB-2',
          specialtyCode: 'cardiology',
          documentAssetIds: ['66666666-6666-4666-8666-666666666666'],
        })
        .expect(201);
      secondCaseId = resubmitResponse.body.data.id;
      assert.notEqual(secondCaseId, firstCaseId);

      const historyResponse = await request(app.getHttpServer())
        .get(`/admin/verification-queue/${secondCaseId}/history`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .expect(200);
      const ids = historyResponse.body.data.map((c: { id: string }) => c.id);
      assert.ok(ids.includes(firstCaseId));
      assert.ok(ids.includes(secondCaseId));

      const approveResponse = await request(app.getHttpServer())
        .patch(`/admin/verification-queue/${secondCaseId}`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ status: 'approved' })
        .expect(200);
      assert.equal(approveResponse.body.data.status, 'approved');

      const promotedAccount = await accountRepository.findById({ toString: () => doctorTwoAccountId });
      assert.equal(promotedAccount?.getRole(), AccountRole.Doctor);
    });
  });

  describe('Patient subject: Rejected -> resubmit -> Approved, with the live identity gate re-check', () => {
    let firstCaseId: string;
    let secondCaseId: string;

    it('reports not_submitted before any submission', async () => {
      const response = await request(app.getHttpServer())
        .get('/patients/me/identity-verification-status')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);
      assert.equal(response.body.data.status, 'not_submitted');
      assert.equal(response.body.data.isVerified, false);
    });

    it('submits identity documents for review', async () => {
      const response = await request(app.getHttpServer())
        .post(`/patients/${patientProfile.getId()}/verifications`)
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ documentAssetIds: ['77777777-7777-4777-8777-777777777777'] })
        .expect(201);
      assert.equal(response.body.data.status, 'submitted');
      firstCaseId = response.body.data.id;
    });

    it('admin rejects the case with a reason', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/verification-queue/${firstCaseId}`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ status: 'rejected', reason: 'ID photo is blurry' })
        .expect(200);
      assert.equal(response.body.data.status, 'rejected');
    });

    it('the identity gate now reports rejected/unverified (a previously-gated action would still be blocked)', async () => {
      const response = await request(app.getHttpServer())
        .get('/patients/me/identity-verification-status')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);
      assert.equal(response.body.data.status, 'rejected');
      assert.equal(response.body.data.isVerified, false);
    });

    it('applicant resubmits, creating a brand-new VerificationCase (different id)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/patients/${patientProfile.getId()}/verifications`)
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ documentAssetIds: ['88888888-8888-4888-8888-888888888888'] })
        .expect(201);
      secondCaseId = response.body.data.id;
      assert.notEqual(secondCaseId, firstCaseId, 'resubmission must create a new case id, not mutate the old one');
    });

    it("admin's history endpoint shows both the old rejected case and the new submitted case", async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/verification-queue/${secondCaseId}/history`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .expect(200);
      const ids = response.body.data.map((c: { id: string }) => c.id);
      assert.ok(ids.includes(firstCaseId));
      assert.ok(ids.includes(secondCaseId));
      assert.equal(response.body.data.length, 2);
    });

    it('admin approves the new case -> final state is approved, and the live gate check now passes', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/verification-queue/${secondCaseId}`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ status: 'approved' })
        .expect(200);
      assert.equal(response.body.data.status, 'approved');

      // Patient approval raises no domain event (per confirmed ground
      // truth) -- the gate is read live off the latest case each check, so
      // this alone must be enough to flip a previously-gated action open.
      const gateCheck = await request(app.getHttpServer())
        .get('/patients/me/identity-verification-status')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);
      assert.equal(gateCheck.body.data.status, 'approved');
      assert.equal(gateCheck.body.data.isVerified, true);
    });
  });
});
