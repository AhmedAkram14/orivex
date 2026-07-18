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
import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import type { MediaAssetRepository } from '../../domain/repositories/media-asset.repository.js';

import { MediaAssetController } from './media-asset.controller.js';

const VALID_TOKEN = 'valid-token';
const OTHER_VALID_TOKEN = 'other-valid-token';

class FakeJwtSigner implements JwtSignerPort {
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    if (token === VALID_TOKEN) {
      return { accountId: '99999999-9999-4999-8999-999999999999', role: AccountRole.Patient };
    }
    if (token === OTHER_VALID_TOKEN) {
      return { accountId: '88888888-8888-4888-8888-888888888888', role: AccountRole.Patient };
    }
    throw new Error('invalid token');
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
});
