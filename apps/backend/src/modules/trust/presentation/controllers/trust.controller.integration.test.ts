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
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { VERIFICATION_CASE_REPOSITORY } from '../../application/ports/tokens.js';
import { DecideVerificationUseCase } from '../../application/use-cases/decide-verification/decide-verification.use-case.js';
import { ListVerificationCasesForSubjectUseCase } from '../../application/use-cases/list-verification-cases-for-subject/list-verification-cases-for-subject.use-case.js';
import { SubmitDoctorVerificationUseCase } from '../../application/use-cases/submit-doctor-verification/submit-doctor-verification.use-case.js';
import { SuspendVerificationCaseUseCase } from '../../application/use-cases/suspend-verification-case/suspend-verification-case.use-case.js';
import type { VerificationCase } from '../../domain/entities/verification-case.entity.js';
import type { VerificationSubjectType } from '../../domain/enums/verification-subject-type.enum.js';
import type { VerificationCaseRepository } from '../../domain/repositories/verification-case.repository.js';

import { DoctorVerificationController } from './doctor-verification.controller.js';
import { VerificationCaseController } from './verification-case.controller.js';

const DOCTOR_TOKEN = 'valid-doctor-token';
const OTHER_DOCTOR_TOKEN = 'valid-other-doctor-token';
const ADMIN_TOKEN = 'valid-admin-token';
// Doctor Onboarding (Phase 4 continuation): same account as DOCTOR_TOKEN,
// but still Patient-role -- proves the widened guard, not a duplicate
// identity.
const PATIENT_APPLICANT_TOKEN = 'valid-patient-applicant-token';

class InMemoryDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile) {}
  async findById(id: string): Promise<DoctorProfile | null> {
    return this.profile.getId() === id ? this.profile : null;
  }
  async findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    return this.profile.getAccountId() === accountId ? this.profile : null;
  }
  async save(): Promise<void> {}
}

class FakeJwtSigner implements JwtSignerPort {
  constructor(private readonly doctorAccountId: string) {}
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    if (token === DOCTOR_TOKEN) {
      return { accountId: this.doctorAccountId, role: AccountRole.Doctor };
    }
    if (token === PATIENT_APPLICANT_TOKEN) {
      return { accountId: this.doctorAccountId, role: AccountRole.Patient };
    }
    if (token === OTHER_DOCTOR_TOKEN) {
      return { accountId: '55555555-5555-4555-8555-555555555555', role: AccountRole.Doctor };
    }
    if (token === ADMIN_TOKEN) {
      return { accountId: '99999999-9999-4999-8999-999999999999', role: AccountRole.SuperAdmin };
    }
    throw new Error('invalid token');
  }
}

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

class NoopDomainEventDispatcher {
  async dispatch(): Promise<void> {
    // intentionally empty
  }

  subscribe(): void {}
}

describe('Trust controllers (integration)', () => {
  let app: INestApplication;
  let doctorProfile: DoctorProfile;
  let createdCaseId: string;

  before(async () => {
    doctorProfile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialty: 'Cardiology',
    });

    const doctorProfileRepository = new InMemoryDoctorProfileRepository(doctorProfile);

    const moduleRef = await Test.createTestingModule({
      controllers: [DoctorVerificationController, VerificationCaseController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        { provide: JWT_SIGNER, useFactory: () => new FakeJwtSigner(doctorProfile.getAccountId()) },
        { provide: VERIFICATION_CASE_REPOSITORY, useClass: InMemoryVerificationCaseRepository },
        { provide: DOMAIN_EVENT_DISPATCHER, useClass: NoopDomainEventDispatcher },
        {
          provide: GetDoctorProfileByIdUseCase,
          useFactory: () => new GetDoctorProfileByIdUseCase(doctorProfileRepository),
        },
        {
          provide: GetDoctorProfileByAccountIdUseCase,
          useFactory: () => new GetDoctorProfileByAccountIdUseCase(doctorProfileRepository),
        },
        {
          provide: SubmitDoctorVerificationUseCase,
          useFactory: (
            repo: VerificationCaseRepository,
            dispatcher: NoopDomainEventDispatcher,
            getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
          ) => new SubmitDoctorVerificationUseCase(repo, dispatcher, getDoctorProfileByIdUseCase),
          inject: [VERIFICATION_CASE_REPOSITORY, DOMAIN_EVENT_DISPATCHER, GetDoctorProfileByIdUseCase],
        },
        {
          provide: DecideVerificationUseCase,
          useFactory: (repo: VerificationCaseRepository, dispatcher: NoopDomainEventDispatcher) =>
            new DecideVerificationUseCase(repo, dispatcher),
          inject: [VERIFICATION_CASE_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
        },
        {
          provide: ListVerificationCasesForSubjectUseCase,
          useFactory: (repo: VerificationCaseRepository) => new ListVerificationCasesForSubjectUseCase(repo),
          inject: [VERIFICATION_CASE_REPOSITORY],
        },
        {
          provide: SuspendVerificationCaseUseCase,
          useFactory: (repo: VerificationCaseRepository) => new SuspendVerificationCaseUseCase(repo),
          inject: [VERIFICATION_CASE_REPOSITORY],
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

  it('POST /doctors/:id/verifications rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer())
      .post(`/doctors/${doctorProfile.getId()}/verifications`)
      .send({
        licenseNumber: 'LIC-1',
        specialtyCode: 'cardiology',
        documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
      })
      .expect(401);

    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('POST /doctors/:id/verifications rejects submitting for another doctor\'s profile', async () => {
    const response = await request(app.getHttpServer())
      .post(`/doctors/${doctorProfile.getId()}/verifications`)
      .set('Authorization', `Bearer ${OTHER_DOCTOR_TOKEN}`)
      .send({
        licenseNumber: 'LIC-1',
        specialtyCode: 'cardiology',
        documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
      })
      .expect(403);

    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  it('POST /doctors/:id/verifications submits credentials for review', async () => {
    const response = await request(app.getHttpServer())
      .post(`/doctors/${doctorProfile.getId()}/verifications`)
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .send({
        licenseNumber: 'LIC-1',
        specialtyCode: 'cardiology',
        documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
      })
      .expect(201);

    assert.equal(response.body.data.status, 'submitted');
    assert.equal(response.body.data.subjectAccountId, doctorProfile.getAccountId());
    assert.equal(response.body.data.subjectType, 'doctor');

    createdCaseId = response.body.data.id;
  });

  it('POST /doctors/:id/verifications rejects a request with no documents', async () => {
    const response = await request(app.getHttpServer())
      .post(`/doctors/${doctorProfile.getId()}/verifications`)
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .send({ licenseNumber: 'LIC-1', specialtyCode: 'cardiology', documentAssetIds: [] })
      .expect(400);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it('PATCH /verifications/:id rejects a non-admin caller with 403', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/verifications/${createdCaseId}`)
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .send({ status: 'approved' })
      .expect(403);

    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  it('PATCH /verifications/:id approves the case', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/verifications/${createdCaseId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ status: 'approved' })
      .expect(200);

    assert.equal(response.body.data.status, 'approved');
    assert.ok(response.body.data.decidedAt);
  });

  it('PATCH /verifications/:id rejects redeciding an already-decided case', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/verifications/${createdCaseId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ status: 'rejected' })
      .expect(409);

    assert.equal(response.body.error.code, 'CONFLICT');
  });

  it('PATCH /verifications/:id returns 404 for an unknown id', async () => {
    const response = await request(app.getHttpServer())
      .patch('/verifications/44444444-4444-4444-8444-444444444444')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ status: 'approved' })
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('GET /doctors/:id/verifications rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer())
      .get(`/doctors/${doctorProfile.getId()}/verifications`)
      .expect(401);

    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /doctors/:id/verifications rejects listing another doctor\'s profile', async () => {
    const response = await request(app.getHttpServer())
      .get(`/doctors/${doctorProfile.getId()}/verifications`)
      .set('Authorization', `Bearer ${OTHER_DOCTOR_TOKEN}`)
      .expect(403);

    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  it('GET /doctors/:id/verifications lists the caller\'s own verification history, most recent first', async () => {
    const response = await request(app.getHttpServer())
      .get(`/doctors/${doctorProfile.getId()}/verifications`)
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(200);

    assert.ok(Array.isArray(response.body.data));
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].id, createdCaseId);
    assert.equal(response.body.data[0].status, 'approved');
  });

  // Doctor Onboarding (Phase 4 continuation): the entire self-service
  // profile/verification surface must work for a still-Patient applicant,
  // not just an already-Doctor account -- every account starts and stays
  // Patient through Draft/Pending/Rejected.
  it('POST /doctors/:id/verifications accepts submission from a still-Patient applicant', async () => {
    const response = await request(app.getHttpServer())
      .post(`/doctors/${doctorProfile.getId()}/verifications`)
      .set('Authorization', `Bearer ${PATIENT_APPLICANT_TOKEN}`)
      .send({
        licenseNumber: 'LIC-1',
        specialtyCode: 'cardiology',
        documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
      })
      .expect(201);

    assert.equal(response.body.data.status, 'submitted');
  });

  it('GET /doctors/:id/verifications is reachable by a still-Patient applicant', async () => {
    const response = await request(app.getHttpServer())
      .get(`/doctors/${doctorProfile.getId()}/verifications`)
      .set('Authorization', `Bearer ${PATIENT_APPLICANT_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 2);
  });
});
