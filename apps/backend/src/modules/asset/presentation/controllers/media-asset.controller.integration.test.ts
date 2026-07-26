import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { Reflector } from '@nestjs/core';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import type { AccessTokenClaims, JwtSignerPort } from '../../../authentication/application/ports/jwt-signer.port.js';
import { JWT_SIGNER } from '../../../authentication/application/ports/tokens.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { MEDIA_ASSET_REPOSITORY, OBJECT_STORAGE } from '../../application/ports/tokens.js';
import { ConfirmUploadUseCase } from '../../application/use-cases/confirm-upload/confirm-upload.use-case.js';
import { CreateUploadIntentUseCase } from '../../application/use-cases/create-upload-intent/create-upload-intent.use-case.js';
import { GetMediaAssetUseCase } from '../../application/use-cases/get-media-asset/get-media-asset.use-case.js';
import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import type { MediaAssetRepository } from '../../domain/repositories/media-asset.repository.js';
import { CheckIdentityVerificationStatusUseCase } from '../../../trust/application/use-cases/check-identity-verification-status/check-identity-verification-status.use-case.js';
import type { IdentityVerificationStatusResult } from '../../../trust/application/use-cases/check-identity-verification-status/check-identity-verification-status.use-case.js';
import { VerificationStatus } from '../../../trust/domain/enums/verification-status.enum.js';

import { MediaAssetController } from './media-asset.controller.js';

const VALID_TOKEN = 'valid-token';
const OTHER_VALID_TOKEN = 'other-valid-token';
const UNVERIFIED_PATIENT_TOKEN = 'unverified-patient-token';
const SUPER_ADMIN_TOKEN = 'super-admin-token';
const VERIFIED_ACCOUNT_ID = '99999999-9999-4999-8999-999999999999';
const UNVERIFIED_ACCOUNT_ID = '77777777-7777-4777-8777-777777777777';

class FakeJwtSigner implements JwtSignerPort {
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    if (token === VALID_TOKEN) {
      return { accountId: VERIFIED_ACCOUNT_ID, role: AccountRole.Patient };
    }
    if (token === OTHER_VALID_TOKEN) {
      return { accountId: '88888888-8888-4888-8888-888888888888', role: AccountRole.Patient };
    }
    if (token === UNVERIFIED_PATIENT_TOKEN) {
      return { accountId: UNVERIFIED_ACCOUNT_ID, role: AccountRole.Patient };
    }
    if (token === SUPER_ADMIN_TOKEN) {
      return { accountId: '66666666-6666-4666-8666-666666666666', role: AccountRole.SuperAdmin };
    }
    throw new Error('invalid token');
  }
}

// Onboarding Redesign (2026-07-21 proposal, Stage O.4) test double --
// CreateUploadIntentUseCase's own real dependency for the inline
// clinical-purpose gate, faked so the controller's real logic runs.
class FakeCheckIdentityVerificationStatusUseCase {
  async execute(query: { subjectAccountId: string }): Promise<IdentityVerificationStatusResult> {
    const isVerified = query.subjectAccountId === VERIFIED_ACCOUNT_ID;
    return { status: isVerified ? VerificationStatus.Approved : 'not_submitted', isVerified };
  }
}

class InMemoryMediaAssetRepository implements MediaAssetRepository {
  private readonly byId = new Map<string, MediaAsset>();
  async findById(id: string): Promise<MediaAsset | null> {
    return this.byId.get(id) ?? null;
  }
  async save(asset: MediaAsset): Promise<void> {
    this.byId.set(asset.getId(), asset);
  }
}

class FakeObjectStorage {
  async createPresignedUploadUrl(storageKey: string): Promise<string> {
    return `https://storage.example.com/${storageKey}?upload=true`;
  }
  async createPresignedDownloadUrl(storageKey: string): Promise<string> {
    return `https://storage.example.com/${storageKey}?download=true`;
  }
  async checkConnectivity(): Promise<void> {}
}

describe('MediaAssetController (integration)', () => {
  let app: INestApplication;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MediaAssetController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        { provide: JWT_SIGNER, useClass: FakeJwtSigner },
        { provide: MEDIA_ASSET_REPOSITORY, useClass: InMemoryMediaAssetRepository },
        { provide: OBJECT_STORAGE, useClass: FakeObjectStorage },
        {
          provide: CreateUploadIntentUseCase,
          useFactory: (repo: MediaAssetRepository, storage: FakeObjectStorage) =>
            new CreateUploadIntentUseCase(repo, storage),
          inject: [MEDIA_ASSET_REPOSITORY, OBJECT_STORAGE],
        },
        {
          provide: ConfirmUploadUseCase,
          useFactory: (repo: MediaAssetRepository, storage: FakeObjectStorage) =>
            new ConfirmUploadUseCase(repo, storage),
          inject: [MEDIA_ASSET_REPOSITORY, OBJECT_STORAGE],
        },
        {
          provide: GetMediaAssetUseCase,
          useFactory: (repo: MediaAssetRepository, storage: FakeObjectStorage) =>
            new GetMediaAssetUseCase(repo, storage),
          inject: [MEDIA_ASSET_REPOSITORY, OBJECT_STORAGE],
        },
        { provide: CheckIdentityVerificationStatusUseCase, useClass: FakeCheckIdentityVerificationStatusUseCase },
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

  it('POST /media-assets/upload-intent rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer())
      .post('/media-assets/upload-intent')
      .send({ contentType: 'image/png', purpose: 'doctor_certificate' })
      .expect(401);

    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('POST /media-assets/upload-intent issues a signed upload URL', async () => {
    const response = await request(app.getHttpServer())
      .post('/media-assets/upload-intent')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ contentType: 'image/png', purpose: 'doctor_certificate' })
      .expect(201);

    assert.equal(response.body.data.status, 'pending');
    assert.equal(response.body.data.purpose, 'doctor_certificate');
    assert.ok(response.body.data.signedUrl.includes('upload=true'));
  });

  it('POST /media-assets/upload-intent rejects an invalid purpose', async () => {
    const response = await request(app.getHttpServer())
      .post('/media-assets/upload-intent')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ contentType: 'image/png', purpose: 'not_a_real_purpose' })
      .expect(400);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it('POST /media-assets/:id/confirm confirms the asset and returns a signed download URL', async () => {
    const created = await request(app.getHttpServer())
      .post('/media-assets/upload-intent')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ contentType: 'application/pdf', purpose: 'lab_report' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/media-assets/${created.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.status, 'confirmed');
    assert.ok(response.body.data.signedUrl.includes('download=true'));
  });

  it('POST /media-assets/:id/confirm returns 404 for an unknown id', async () => {
    const response = await request(app.getHttpServer())
      .post('/media-assets/11111111-1111-4111-8111-111111111111/confirm')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  // Onboarding Redesign (2026-07-21 proposal, Stage O.4): only a Patient's
  // clinical-document uploads (clinical_attachment/lab_report) require
  // identity verification -- never identity-verification documents
  // themselves, and never a non-clinical purpose like profile_image.
  it('POST /media-assets/upload-intent returns 403 IDENTITY_VERIFICATION_REQUIRED for an unverified patient uploading a clinical_attachment', async () => {
    const response = await request(app.getHttpServer())
      .post('/media-assets/upload-intent')
      .set('Authorization', `Bearer ${UNVERIFIED_PATIENT_TOKEN}`)
      .send({ contentType: 'application/pdf', purpose: 'clinical_attachment' })
      .expect(403);

    assert.equal(response.body.error.code, 'IDENTITY_VERIFICATION_REQUIRED');
  });

  it('POST /media-assets/upload-intent never gates a non-clinical purpose for an unverified patient', async () => {
    const response = await request(app.getHttpServer())
      .post('/media-assets/upload-intent')
      .set('Authorization', `Bearer ${UNVERIFIED_PATIENT_TOKEN}`)
      .send({ contentType: 'image/png', purpose: 'profile_image' })
      .expect(201);

    assert.equal(response.body.data.purpose, 'profile_image');
  });

  it('POST /media-assets/upload-intent never gates an unverified patient\'s own identity-verification documents (national_id_front)', async () => {
    const response = await request(app.getHttpServer())
      .post('/media-assets/upload-intent')
      .set('Authorization', `Bearer ${UNVERIFIED_PATIENT_TOKEN}`)
      .send({ contentType: 'image/png', purpose: 'national_id_front' })
      .expect(201);

    assert.equal(response.body.data.purpose, 'national_id_front');
  });

  it('POST /media-assets/:id/confirm returns 404 for an asset owned by a different account', async () => {
    const created = await request(app.getHttpServer())
      .post('/media-assets/upload-intent')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ contentType: 'application/pdf', purpose: 'lab_report' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/media-assets/${created.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${OTHER_VALID_TOKEN}`)
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  // Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): the
  // first read/download capability this controller has ever exposed.
  it('GET /media-assets/:id lets the owner re-fetch their own confirmed asset', async () => {
    const created = await request(app.getHttpServer())
      .post('/media-assets/upload-intent')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ contentType: 'image/jpeg', purpose: 'national_id_front' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/media-assets/${created.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/media-assets/${created.body.data.id}`)
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.status, 'confirmed');
    assert.equal(response.body.data.purpose, 'national_id_front');
    assert.ok(response.body.data.signedUrl.includes('download=true'));
  });

  it('GET /media-assets/:id lets a SuperAdmin open a document they do not own (reviewing a verification case)', async () => {
    const created = await request(app.getHttpServer())
      .post('/media-assets/upload-intent')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ contentType: 'image/jpeg', purpose: 'selfie_with_id' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/media-assets/${created.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/media-assets/${created.body.data.id}`)
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);

    assert.ok(response.body.data.signedUrl.includes('download=true'));
  });

  it('GET /media-assets/:id returns 404 for a non-owner, non-admin caller', async () => {
    const created = await request(app.getHttpServer())
      .post('/media-assets/upload-intent')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ contentType: 'application/pdf', purpose: 'lab_report' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/media-assets/${created.body.data.id}`)
      .set('Authorization', `Bearer ${OTHER_VALID_TOKEN}`)
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });
});
