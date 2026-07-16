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
import { NOTIFICATION_REPOSITORY } from '../../application/ports/tokens.js';
import { ListNotificationsForAccountUseCase } from '../../application/use-cases/list-notifications-for-account/list-notifications-for-account.use-case.js';
import { MarkAllNotificationsReadUseCase } from '../../application/use-cases/mark-all-notifications-read/mark-all-notifications-read.use-case.js';
import { MarkNotificationReadUseCase } from '../../application/use-cases/mark-notification-read/mark-notification-read.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

import { NotificationController } from './notification.controller.js';

const VALID_TOKEN = 'valid-notification-token';
const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ACCOUNT_ID = '22222222-2222-4222-8222-222222222222';

class InMemoryNotificationRepository implements NotificationRepository {
  private readonly byId = new Map<string, Notification>();
  seed(notification: Notification): void {
    this.byId.set(notification.getId(), notification);
  }
  async findById(id: string): Promise<Notification | null> {
    return this.byId.get(id) ?? null;
  }
  async findByAccountId(accountId: string): Promise<Notification[]> {
    return Array.from(this.byId.values()).filter((n) => n.getAccountId() === accountId);
  }
  async save(notification: Notification): Promise<void> {
    this.byId.set(notification.getId(), notification);
  }
}

class FakeJwtSigner implements JwtSignerPort {
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    if (token !== VALID_TOKEN) {
      throw new Error('invalid token');
    }
    return { accountId: ACCOUNT_ID, role: AccountRole.Patient };
  }
}

describe('NotificationController (integration)', () => {
  let app: INestApplication;
  let repository: InMemoryNotificationRepository;
  let mine: Notification;

  before(async () => {
    repository = new InMemoryNotificationRepository();
    mine = Notification.create({ accountId: ACCOUNT_ID, title: 'Appointment confirmed', description: 'Your visit is confirmed.' });
    const alsoMine = Notification.create({ accountId: ACCOUNT_ID, title: 'Prescription ready', description: 'Pick it up.' });
    const theirs = Notification.create({ accountId: OTHER_ACCOUNT_ID, title: 'Not yours', description: 'Should not appear.' });
    repository.seed(mine);
    repository.seed(alsoMine);
    repository.seed(theirs);

    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        { provide: JWT_SIGNER, useFactory: () => new FakeJwtSigner() },
        { provide: NOTIFICATION_REPOSITORY, useValue: repository },
        {
          provide: ListNotificationsForAccountUseCase,
          useFactory: (repo: NotificationRepository) => new ListNotificationsForAccountUseCase(repo),
          inject: [NOTIFICATION_REPOSITORY],
        },
        {
          provide: MarkNotificationReadUseCase,
          useFactory: (repo: NotificationRepository) => new MarkNotificationReadUseCase(repo),
          inject: [NOTIFICATION_REPOSITORY],
        },
        {
          provide: MarkAllNotificationsReadUseCase,
          useFactory: (repo: NotificationRepository) => new MarkAllNotificationsReadUseCase(repo),
          inject: [NOTIFICATION_REPOSITORY],
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

  it('GET /notifications rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/notifications').expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it("GET /notifications returns only the caller's own notifications", async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 2);
    assert.ok(response.body.data.every((n: { read: boolean }) => n.read === false));
  });

  it('POST /notifications/:id/read marks one notification as read', async () => {
    const response = await request(app.getHttpServer())
      .post(`/notifications/${mine.getId()}/read`)
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.id, mine.getId());
    assert.equal(response.body.data.read, true);
  });

  it("POST /notifications/:id/read rejects marking another account's notification", async () => {
    const theirsId = (await repository.findByAccountId(OTHER_ACCOUNT_ID))[0]?.getId();
    assert.ok(theirsId);

    const response = await request(app.getHttpServer())
      .post(`/notifications/${theirsId}/read`)
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('POST /notifications/read-all marks every remaining notification as read', async () => {
    const response = await request(app.getHttpServer())
      .post('/notifications/read-all')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 2);
    assert.ok(response.body.data.every((n: { read: boolean }) => n.read === true));
  });
});
