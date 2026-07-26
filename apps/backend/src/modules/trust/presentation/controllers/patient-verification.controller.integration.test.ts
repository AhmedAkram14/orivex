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
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PATIENT_PROFILE_REPOSITORY } from '../../../patient/application/ports/tokens.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import { VERIFICATION_CASE_REPOSITORY } from '../../application/ports/tokens.js';
import { CheckIdentityVerificationStatusUseCase } from '../../application/use-cases/check-identity-verification-status/check-identity-verification-status.use-case.js';
import { ListVerificationCasesForSubjectUseCase } from '../../application/use-cases/list-verification-cases-for-subject/list-verification-cases-for-subject.use-case.js';
import { SubmitPatientVerificationUseCase } from '../../application/use-cases/submit-patient-verification/submit-patient-verification.use-case.js';
import type { VerificationCase } from '../../domain/entities/verification-case.entity.js';
import type { VerificationSubjectType } from '../../domain/enums/verification-subject-type.enum.js';
import type { VerificationCaseRepository } from '../../domain/repositories/verification-case.repository.js';

import { PatientVerificationController } from './patient-verification.controller.js';

const PATIENT_TOKEN = 'valid-patient-token';
const OTHER_PATIENT_TOKEN = 'valid-other-patient-token';

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
  constructor(private readonly patientAccountId: string) {}
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    if (token === PATIENT_TOKEN) {
      return { accountId: this.patientAccountId, role: AccountRole.Patient };
    }
    if (token === OTHER_PATIENT_TOKEN) {
      return { accountId: '55555555-5555-4555-8555-555555555555', role: AccountRole.Patient };
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
    return [...this.byId.values()].filter(
      (verificationCase) =>
        verificationCase.getSubjectType() === subjectType && verificationCase.getSubjectAccountId() === subjectAccountId,
    );
  }
  async save(verificationCase: VerificationCase): Promise<void> {
    this.byId.set(verificationCase.getId(), verificationCase);
  }
}

class NoopDomainEventDispatcher {
  async dispatch(): Promise<void> {}
  subscribe(): void {}
}

describe('PatientVerificationController (integration)', () => {
  let app: INestApplication;
  let patientProfile: PatientProfile;

  before(async () => {
    patientProfile = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    const patientProfileRepository = new InMemoryPatientProfileRepository(patientProfile);

    const moduleRef = await Test.createTestingModule({
      controllers: [PatientVerificationController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        { provide: JWT_SIGNER, useFactory: () => new FakeJwtSigner(patientProfile.getAccountId()) },
        { provide: VERIFICATION_CASE_REPOSITORY, useClass: InMemoryVerificationCaseRepository },
        { provide: PATIENT_PROFILE_REPOSITORY, useValue: patientProfileRepository },
        { provide: DOMAIN_EVENT_DISPATCHER, useClass: NoopDomainEventDispatcher },
        {
          provide: GetPatientProfileByIdUseCase,
          useFactory: () => new GetPatientProfileByIdUseCase(patientProfileRepository),
        },
        {
          provide: GetPatientProfileByAccountIdUseCase,
          useFactory: () => new GetPatientProfileByAccountIdUseCase(patientProfileRepository),
        },
        {
          provide: SubmitPatientVerificationUseCase,
          useFactory: (
            repo: VerificationCaseRepository,
            dispatcher: NoopDomainEventDispatcher,
            getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
          ) => new SubmitPatientVerificationUseCase(repo, dispatcher, getPatientProfileByIdUseCase),
          inject: [VERIFICATION_CASE_REPOSITORY, DOMAIN_EVENT_DISPATCHER, GetPatientProfileByIdUseCase],
        },
        {
          provide: ListVerificationCasesForSubjectUseCase,
          useFactory: (repo: VerificationCaseRepository) => new ListVerificationCasesForSubjectUseCase(repo),
          inject: [VERIFICATION_CASE_REPOSITORY],
        },
        {
          provide: CheckIdentityVerificationStatusUseCase,
          useFactory: (repo: VerificationCaseRepository) => new CheckIdentityVerificationStatusUseCase(repo),
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

  // Onboarding Redesign (2026-07-21 proposal, Stage O.4): UX convenience --
  // placed before any submission below so it reflects the true "never
  // submitted" starting state.
  it('GET /patients/me/identity-verification-status rejects a request with no bearer token', async () => {
    await request(app.getHttpServer()).get('/patients/me/identity-verification-status').expect(401);
  });

  it('GET /patients/me/identity-verification-status reports not_submitted/unverified before any submission', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients/me/identity-verification-status')
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.status, 'not_submitted');
    assert.equal(response.body.data.isVerified, false);
  });

  it('POST /patients/:id/verifications rejects a request with no bearer token', async () => {
    await request(app.getHttpServer())
      .post(`/patients/${patientProfile.getId()}/verifications`)
      .send({ documentAssetIds: ['22222222-2222-4222-8222-222222222222'] })
      .expect(401);
  });

  it('POST /patients/:id/verifications rejects submitting for another patient\'s profile', async () => {
    await request(app.getHttpServer())
      .post(`/patients/${patientProfile.getId()}/verifications`)
      .set('Authorization', `Bearer ${OTHER_PATIENT_TOKEN}`)
      .send({ documentAssetIds: ['22222222-2222-4222-8222-222222222222'] })
      .expect(403);
  });

  it('POST /patients/:id/verifications submits identity documents for review', async () => {
    const response = await request(app.getHttpServer())
      .post(`/patients/${patientProfile.getId()}/verifications`)
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .send({ documentAssetIds: ['22222222-2222-4222-8222-222222222222'] })
      .expect(201);

    assert.equal(response.body.data.status, 'submitted');
    assert.equal(response.body.data.subjectType, 'patient');
    assert.equal(response.body.data.subjectAccountId, patientProfile.getAccountId());
    assert.equal(response.body.data.licenseNumber, undefined);
  });

  it('GET /patients/me/identity-verification-status reflects a submitted-but-not-yet-decided case', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients/me/identity-verification-status')
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.status, 'submitted');
    assert.equal(response.body.data.isVerified, false);
  });

  it('POST /patients/:id/verifications rejects a request with no documents', async () => {
    await request(app.getHttpServer())
      .post(`/patients/${patientProfile.getId()}/verifications`)
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .send({ documentAssetIds: [] })
      .expect(400);
  });

  it('GET /patients/:id/verifications lists the caller\'s own submissions', async () => {
    const response = await request(app.getHttpServer())
      .get(`/patients/${patientProfile.getId()}/verifications`)
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].subjectType, 'patient');
  });

  it('GET /patients/:id/verifications rejects listing another patient\'s profile', async () => {
    await request(app.getHttpServer())
      .get(`/patients/${patientProfile.getId()}/verifications`)
      .set('Authorization', `Bearer ${OTHER_PATIENT_TOKEN}`)
      .expect(403);
  });
});
