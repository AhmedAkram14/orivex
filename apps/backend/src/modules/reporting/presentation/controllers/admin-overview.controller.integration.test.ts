import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import type { AccessTokenClaims, JwtSignerPort } from '../../../authentication/application/ports/jwt-signer.port.js';
import { JWT_SIGNER } from '../../../authentication/application/ports/tokens.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import {
  GetAdminOverviewUseCase,
  type AdminOverviewResult,
} from '../../application/use-cases/get-admin-overview/get-admin-overview.use-case.js';

import { AdminOverviewController } from './admin-overview.controller.js';

const SUPER_ADMIN_TOKEN = 'valid-super-admin-token';
const DOCTOR_TOKEN = 'valid-doctor-token';

class FakeJwtSigner implements JwtSignerPort {
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    if (token === SUPER_ADMIN_TOKEN) return { accountId: '99999999-9999-4999-8999-999999999999', role: AccountRole.SuperAdmin };
    if (token === DOCTOR_TOKEN) return { accountId: '88888888-8888-4888-8888-888888888888', role: AccountRole.Doctor };
    throw new Error('invalid token');
  }
}

const overview: AdminOverviewResult = {
  generatedAt: new Date('2026-10-18T09:00:00.000Z'),
  needsAttention: {
    pendingVerifications: { count: 3, oldestWaitingSince: new Date('2026-10-14T08:00:00.000Z') },
    openDisputes: { count: 0, oldestWaitingSince: null },
    flaggedReviews: { count: 2, oldestWaitingSince: null },
  },
  averageVerificationReviewHours: 31.5,
  health: {
    appointmentsToday: 6,
    appointmentsLast7Days: 31,
    completionRate: 0.713,
    cancellationRate: 0.054,
    noShowRate: 0.027,
    revenueToday: 1200,
    revenueChangePercent: null,
    failedPayments: 2,
    activeDoctors: 9,
    activePatients: 13,
    activeWindowDays: 30,
  },
};

describe('AdminOverviewController (integration)', () => {
  let app: INestApplication;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminOverviewController],
      providers: [
        { provide: JWT_SIGNER, useClass: FakeJwtSigner },
        JwtAuthGuard,
        RolesGuard,
        Reflector,
        PinoLoggerService,
        { provide: GetAdminOverviewUseCase, useValue: { execute: async () => overview } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, exceptionFactory: createValidationException }),
    );
    app.useGlobalFilters(new AllExceptionsFilter(moduleRef.get(PinoLoggerService)));
    await app.init();
  });

  after(async () => {
    await app.close();
  });

  it('GET /admin/overview rejects a request with no bearer token', async () => {
    await request(app.getHttpServer()).get('/admin/overview').expect(401);
  });

  it('GET /admin/overview rejects a non-SuperAdmin caller with 403', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/overview')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(403);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  it('GET /admin/overview returns the work queues with ISO timestamps and the health strip', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/overview')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);

    const { data } = response.body;
    assert.equal(data.generatedAt, '2026-10-18T09:00:00.000Z');
    assert.deepEqual(data.needsAttention.pendingVerifications, { count: 3, oldestWaitingSince: '2026-10-14T08:00:00.000Z' });
    assert.deepEqual(data.needsAttention.openDisputes, { count: 0, oldestWaitingSince: null });
    assert.deepEqual(data.needsAttention.flaggedReviews, { count: 2, oldestWaitingSince: null });
    assert.equal(data.averageVerificationReviewHours, 31.5);
    assert.equal(data.health.activePatients, 13);
    assert.equal(data.health.activeDoctors, 9);
    assert.equal(data.health.revenueChangePercent, null);
  });
});
