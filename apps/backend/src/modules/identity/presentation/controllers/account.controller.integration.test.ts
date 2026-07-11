import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../../../shared/domain/tokens.js';
import { ACCOUNT_REPOSITORY } from '../../application/ports/tokens.js';
import { GetAccountByIdUseCase } from '../../application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { RegisterAccountUseCase } from '../../application/use-cases/register-account/register-account.use-case.js';
import { SuspendAccountUseCase } from '../../application/use-cases/suspend-account/suspend-account.use-case.js';
import type { Account } from '../../domain/entities/account.entity.js';
import type { AccountRepository } from '../../domain/repositories/account.repository.js';
import type { AccountId } from '../../domain/value-objects/account-id.value-object.js';
import type { EmailAddress } from '../../domain/value-objects/email-address.value-object.js';

import { AccountController } from './account.controller.js';

// In-memory doubles standing in for the real Prisma repository/event
// dispatcher — no Docker/Postgres available in this sandbox. This proves
// the real HTTP wiring (controller -> DTO validation -> use case ->
// exception filter -> response envelope), not Prisma's SQL.
class InMemoryAccountRepository implements AccountRepository {
  private readonly byId = new Map<string, Account>();

  async findById(id: AccountId): Promise<Account | null> {
    return this.byId.get(id.toString()) ?? null;
  }

  async findByEmail(email: EmailAddress): Promise<Account | null> {
    for (const account of this.byId.values()) {
      if (account.getEmail().equals(email)) {
        return account;
      }
    }
    return null;
  }

  async save(account: Account): Promise<void> {
    this.byId.set(account.getId().toString(), account);
  }
}

class NoopDomainEventDispatcher {
  async dispatch(): Promise<void> {
    // intentionally empty
  }
}

describe('AccountController (integration)', () => {
  let app: INestApplication;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        PinoLoggerService,
        { provide: ACCOUNT_REPOSITORY, useClass: InMemoryAccountRepository },
        { provide: DOMAIN_EVENT_DISPATCHER, useClass: NoopDomainEventDispatcher },
        {
          provide: RegisterAccountUseCase,
          useFactory: (repo: AccountRepository, dispatcher: NoopDomainEventDispatcher) =>
            new RegisterAccountUseCase(repo, dispatcher),
          inject: [ACCOUNT_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
        },
        {
          provide: SuspendAccountUseCase,
          useFactory: (repo: AccountRepository, dispatcher: NoopDomainEventDispatcher) =>
            new SuspendAccountUseCase(repo, dispatcher),
          inject: [ACCOUNT_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
        },
        {
          provide: GetAccountByIdUseCase,
          useFactory: (repo: AccountRepository) => new GetAccountByIdUseCase(repo),
          inject: [ACCOUNT_REPOSITORY],
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

  it('POST /accounts registers a new account and returns the envelope shape', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .send({
        email: 'doctor@example.com',
        keycloakId: 'kc-123',
        role: 'doctor',
        displayName: 'Dr. Amina Hassan',
      })
      .expect(201);

    assert.equal(response.body.data.email, 'doctor@example.com');
    assert.equal(response.body.data.status, 'active');
    assert.equal(response.body.data.displayName, 'Dr. Amina Hassan');
    assert.equal(response.body.data.keycloakId, undefined);
    assert.ok(response.body.meta.requestId);
    assert.ok(response.body.meta.timestamp);
  });

  it('POST /accounts rejects an invalid email with a structured validation error', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .send({
        email: 'not-an-email',
        keycloakId: 'kc-456',
        role: 'patient',
        displayName: 'Someone',
      })
      .expect(400);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
    assert.ok(response.body.error.details.some((d: { field?: string }) => d.field === 'email'));
  });

  it('POST /accounts rejects a duplicate email with 409 Conflict', async () => {
    await request(app.getHttpServer())
      .post('/accounts')
      .send({
        email: 'dup@example.com',
        keycloakId: 'kc-dup-1',
        role: 'patient',
        displayName: 'First',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/accounts')
      .send({
        email: 'dup@example.com',
        keycloakId: 'kc-dup-2',
        role: 'patient',
        displayName: 'Second',
      })
      .expect(409);

    assert.equal(response.body.error.code, 'CONFLICT');
  });

  it('GET /accounts/:id returns the account when it exists', async () => {
    const created = await request(app.getHttpServer())
      .post('/accounts')
      .send({
        email: 'getme@example.com',
        keycloakId: 'kc-getme',
        role: 'patient',
        displayName: 'Get Me',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/accounts/${created.body.data.id}`)
      .expect(200);

    assert.equal(response.body.data.email, 'getme@example.com');
  });

  it('GET /accounts/:id returns 404 for a well-formed but unknown id', async () => {
    const response = await request(app.getHttpServer())
      .get('/accounts/11111111-1111-4111-8111-111111111111')
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('GET /accounts/:id returns 400 for a malformed id', async () => {
    await request(app.getHttpServer()).get('/accounts/not-a-uuid').expect(400);
  });

  it('PATCH /accounts/:id/suspend suspends the account and returns updated state', async () => {
    const created = await request(app.getHttpServer())
      .post('/accounts')
      .send({
        email: 'suspendme@example.com',
        keycloakId: 'kc-suspendme',
        role: 'patient',
        displayName: 'Suspend Me',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/accounts/${created.body.data.id}/suspend`)
      .expect(200);

    assert.equal(response.body.data.status, 'suspended');
  });

  it('PATCH /accounts/:id/suspend returns 404 for an unknown account', async () => {
    const response = await request(app.getHttpServer())
      .patch('/accounts/22222222-2222-4222-8222-222222222222/suspend')
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });
});
