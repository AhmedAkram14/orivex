import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import type { AccessTokenClaims, JwtSignerPort } from '../../../authentication/application/ports/jwt-signer.port.js';
import { JWT_SIGNER } from '../../../authentication/application/ports/tokens.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { ACCOUNT_REPOSITORY } from '../../application/ports/tokens.js';
import { GetAccountByIdUseCase } from '../../application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { UpdatePersonalProfileUseCase } from '../../application/use-cases/update-personal-profile/update-personal-profile.use-case.js';
import { Account } from '../../domain/entities/account.entity.js';
import { AccountRole } from '../../domain/enums/account-role.enum.js';
import type { AccountId } from '../../domain/value-objects/account-id.value-object.js';
import { DisplayName } from '../../domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../domain/value-objects/email-address.value-object.js';

import { MyAccountController } from './my-account.controller.js';

const VALID_TOKEN = 'valid-token';

class FakeJwtSigner implements JwtSignerPort {
  constructor(private readonly accountId: string) {}
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    if (token === VALID_TOKEN) {
      return { accountId: this.accountId, role: AccountRole.Patient };
    }
    throw new Error('invalid token');
  }
}

class InMemoryAccountRepository {
  private readonly byId = new Map<string, Account>();

  constructor(seed: Account[]) {
    for (const account of seed) this.byId.set(account.getId().toString(), account);
  }
  async findById(id: AccountId): Promise<Account | null> {
    return this.byId.get(id.toString()) ?? null;
  }
  async findByEmail(): Promise<Account | null> {
    return null;
  }
  async findAll(): Promise<{ accounts: Account[]; total: number }> {
    return { accounts: [], total: 0 };
  }
  async save(account: Account): Promise<void> {
    this.byId.set(account.getId().toString(), account);
  }
}

// Onboarding Redesign (2026-07-21 proposal, §0a/§14 Stage O.1): the
// self-service "my own account" surface -- deliberately separate from
// AccountController, which is entirely SuperAdmin-gated admin provisioning.
describe('MyAccountController (integration)', () => {
  let app: INestApplication;
  let accountId: string;

  before(async () => {
    const account = Account.register({
      email: EmailAddress.create('patient@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Sara Patient'),
    });
    accountId = account.getId().toString();
    const accountRepository = new InMemoryAccountRepository([account]);
    const jwtSigner = new FakeJwtSigner(accountId);

    const moduleRef = await Test.createTestingModule({
      controllers: [MyAccountController],
      providers: [
        PinoLoggerService,
        JwtAuthGuard,
        { provide: JWT_SIGNER, useFactory: () => jwtSigner },
        { provide: ACCOUNT_REPOSITORY, useFactory: () => accountRepository },
        {
          provide: GetAccountByIdUseCase,
          useFactory: () => new GetAccountByIdUseCase(accountRepository),
        },
        {
          provide: UpdatePersonalProfileUseCase,
          useFactory: () => new UpdatePersonalProfileUseCase(accountRepository),
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

  it('GET /accounts/me rejects a request with no bearer token', async () => {
    await request(app.getHttpServer()).get('/accounts/me').expect(401);
  });

  it('GET /accounts/me returns the caller\'s own account', async () => {
    const response = await request(app.getHttpServer())
      .get('/accounts/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.id, accountId);
    assert.equal(response.body.data.displayName, 'Sara Patient');
  });

  it('PATCH /accounts/me updates the shared personal-profile fields', async () => {
    const response = await request(app.getHttpServer())
      .patch('/accounts/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        dateOfBirth: '1995-06-15',
        gender: 'female',
        address: '10 Zamalek Street, Cairo',
      })
      .expect(200);

    assert.equal(response.body.data.dateOfBirth.slice(0, 10), '1995-06-15');
    assert.equal(response.body.data.gender, 'female');
    assert.equal(response.body.data.address, '10 Zamalek Street, Cairo');
  });

  it('PATCH /accounts/me rejects an invalid gender value', async () => {
    await request(app.getHttpServer())
      .patch('/accounts/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ gender: 'not-a-real-gender' })
      .expect(400);
  });
});
