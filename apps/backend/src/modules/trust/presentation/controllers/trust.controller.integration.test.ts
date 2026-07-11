import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../../../shared/domain/tokens.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { VERIFICATION_CASE_REPOSITORY } from '../../application/ports/tokens.js';
import { DecideVerificationUseCase } from '../../application/use-cases/decide-verification/decide-verification.use-case.js';
import { SubmitDoctorVerificationUseCase } from '../../application/use-cases/submit-doctor-verification/submit-doctor-verification.use-case.js';
import type { VerificationCase } from '../../domain/entities/verification-case.entity.js';
import type { VerificationCaseRepository } from '../../domain/repositories/verification-case.repository.js';

import { DoctorVerificationController } from './doctor-verification.controller.js';
import { VerificationCaseController } from './verification-case.controller.js';

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

class InMemoryVerificationCaseRepository implements VerificationCaseRepository {
  private readonly byId = new Map<string, VerificationCase>();
  async findById(id: string): Promise<VerificationCase | null> {
    return this.byId.get(id) ?? null;
  }
  async findPendingReview(): Promise<VerificationCase[]> {
    return [...this.byId.values()];
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

    const moduleRef = await Test.createTestingModule({
      controllers: [DoctorVerificationController, VerificationCaseController],
      providers: [
        PinoLoggerService,
        { provide: VERIFICATION_CASE_REPOSITORY, useClass: InMemoryVerificationCaseRepository },
        { provide: DOMAIN_EVENT_DISPATCHER, useClass: NoopDomainEventDispatcher },
        {
          provide: GetDoctorProfileByIdUseCase,
          useFactory: () => new GetDoctorProfileByIdUseCase(new InMemoryDoctorProfileRepository(doctorProfile)),
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

  it('POST /doctors/:id/verifications submits credentials for review', async () => {
    const response = await request(app.getHttpServer())
      .post(`/doctors/${doctorProfile.getId()}/verifications`)
      .send({
        licenseNumber: 'LIC-1',
        specialtyCode: 'cardiology',
        documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
      })
      .expect(201);

    assert.equal(response.body.data.status, 'submitted');
    assert.equal(response.body.data.doctorId, doctorProfile.getId());

    createdCaseId = response.body.data.id;
  });

  it('POST /doctors/:id/verifications rejects an unknown doctor with 404', async () => {
    const response = await request(app.getHttpServer())
      .post('/doctors/33333333-3333-4333-8333-333333333333/verifications')
      .send({
        licenseNumber: 'LIC-1',
        specialtyCode: 'cardiology',
        documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
      })
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('POST /doctors/:id/verifications rejects a request with no documents', async () => {
    const response = await request(app.getHttpServer())
      .post(`/doctors/${doctorProfile.getId()}/verifications`)
      .send({ licenseNumber: 'LIC-1', specialtyCode: 'cardiology', documentAssetIds: [] })
      .expect(400);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it('PATCH /verifications/:id approves the case', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/verifications/${createdCaseId}`)
      .send({ status: 'approved' })
      .expect(200);

    assert.equal(response.body.data.status, 'approved');
    assert.ok(response.body.data.decidedAt);
  });

  it('PATCH /verifications/:id rejects redeciding an already-decided case', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/verifications/${createdCaseId}`)
      .send({ status: 'rejected' })
      .expect(422);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it('PATCH /verifications/:id returns 404 for an unknown id', async () => {
    const response = await request(app.getHttpServer())
      .patch('/verifications/44444444-4444-4444-8444-444444444444')
      .send({ status: 'approved' })
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });
});
