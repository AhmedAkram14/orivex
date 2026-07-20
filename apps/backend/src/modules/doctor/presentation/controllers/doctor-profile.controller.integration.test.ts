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
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { Account } from '../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../identity/domain/repositories/account.repository.js';
import type { AccountId } from '../../../identity/domain/value-objects/account-id.value-object.js';
import { DisplayName } from '../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../identity/domain/value-objects/email-address.value-object.js';
import { DOCTOR_PROFILE_REPOSITORY } from '../../application/ports/tokens.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { RegisterDoctorProfileUseCase } from '../../application/use-cases/register-doctor-profile/register-doctor-profile.use-case.js';
import { UpdateDoctorProfileUseCase } from '../../application/use-cases/update-doctor-profile/update-doctor-profile.use-case.js';
import { DoctorProfile } from '../../domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../domain/repositories/doctor-profile.repository.js';

import { DoctorProfileController } from './doctor-profile.controller.js';

const VALID_TOKEN = 'valid-doctor-token';
const OTHER_VALID_TOKEN = 'valid-doctor-token-no-profile';
const EXISTING_ACCOUNT_TOKEN = 'valid-doctor-token-existing-account';
const UNKNOWN_ACCOUNT_TOKEN = 'valid-doctor-token-unknown-account';

class InMemoryAccountRepository implements AccountRepository {
  constructor(private readonly accounts: Account[]) {}
  async findById(id: AccountId): Promise<Account | null> {
    return this.accounts.find((account) => account.getId().equals(id)) ?? null;
  }
  async findByEmail(): Promise<Account | null> {
    return null;
  }

  findAll(): Promise<{ accounts: Account[]; total: number }> {
    return Promise.resolve({ accounts: [], total: 0 });
  }
  async save(): Promise<void> {}
}

class FakeJwtSigner implements JwtSignerPort {
  constructor(private readonly accountIdByToken: Map<string, string>) {}
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    const accountId = this.accountIdByToken.get(token);
    if (!accountId) {
      throw new Error('invalid token');
    }
    return { accountId, role: AccountRole.Doctor };
  }
}

class InMemoryDoctorProfileRepository implements DoctorProfileRepository {
  private readonly byId = new Map<string, DoctorProfile>();

  async findById(id: string): Promise<DoctorProfile | null> {
    return this.byId.get(id) ?? null;
  }
  async findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    for (const profile of this.byId.values()) {
      if (profile.getAccountId() === accountId) {
        return profile;
      }
    }
    return null;
  }
  async save(profile: DoctorProfile): Promise<void> {
    this.byId.set(profile.getId(), profile);
  }
}

class NoopDomainEventDispatcher {
  async dispatch(): Promise<void> {
    // intentionally empty
  }

  subscribe(): void {}
}

describe('DoctorProfileController (integration)', () => {
  let app: INestApplication;
  let existingAccountId: string;
  let registeredProfileId: string;
  let meAccountId: string;
  let noProfileAccountId: string;

  before(async () => {
    const account = Account.register({
      email: EmailAddress.create('doctor@example.com'),
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Dr. Test'),
    });
    existingAccountId = account.getId().toString();

    const meAccount = Account.register({
      email: EmailAddress.create('nourhan.adel@example.com'),
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Nourhan Adel'),
    });
    meAccountId = meAccount.getId().toString();

    const accountWithoutProfile = Account.register({
      email: EmailAddress.create('karim.fathy@example.com'),
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Karim Fathy'),
    });
    noProfileAccountId = accountWithoutProfile.getId().toString();

    const accountRepository = new InMemoryAccountRepository([account, meAccount, accountWithoutProfile]);
    const doctorProfileRepository = new InMemoryDoctorProfileRepository();

    const meProfile = DoctorProfile.register({
      accountId: meAccountId,
      licenseNumber: 'LIC-12345',
      specialty: 'Cardiology',
      biography: 'Experienced cardiologist.',
      yearsOfExperience: 8,
      languages: ['ar', 'en'],
      consultationFeeAmount: 350,
    });
    await doctorProfileRepository.save(meProfile);

    const jwtSigner = new FakeJwtSigner(
      new Map([
        [VALID_TOKEN, meAccountId],
        [OTHER_VALID_TOKEN, noProfileAccountId],
        [EXISTING_ACCOUNT_TOKEN, existingAccountId],
        [UNKNOWN_ACCOUNT_TOKEN, '22222222-2222-4222-8222-222222222222'],
      ]),
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [DoctorProfileController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        { provide: JWT_SIGNER, useFactory: () => jwtSigner },
        { provide: DOCTOR_PROFILE_REPOSITORY, useValue: doctorProfileRepository },
        { provide: DOMAIN_EVENT_DISPATCHER, useClass: NoopDomainEventDispatcher },
        {
          provide: GetAccountByIdUseCase,
          useFactory: () => new GetAccountByIdUseCase(accountRepository),
        },
        {
          provide: RegisterDoctorProfileUseCase,
          useFactory: (
            repo: DoctorProfileRepository,
            dispatcher: NoopDomainEventDispatcher,
            getAccountByIdUseCase: GetAccountByIdUseCase,
          ) => new RegisterDoctorProfileUseCase(repo, dispatcher, getAccountByIdUseCase),
          inject: [DOCTOR_PROFILE_REPOSITORY, DOMAIN_EVENT_DISPATCHER, GetAccountByIdUseCase],
        },
        {
          provide: UpdateDoctorProfileUseCase,
          useFactory: (repo: DoctorProfileRepository, dispatcher: NoopDomainEventDispatcher) =>
            new UpdateDoctorProfileUseCase(repo, dispatcher),
          inject: [DOCTOR_PROFILE_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
        },
        {
          provide: GetDoctorProfileByIdUseCase,
          useFactory: (repo: DoctorProfileRepository) => new GetDoctorProfileByIdUseCase(repo),
          inject: [DOCTOR_PROFILE_REPOSITORY],
        },
        {
          provide: GetDoctorProfileByAccountIdUseCase,
          useFactory: (repo: DoctorProfileRepository) => new GetDoctorProfileByAccountIdUseCase(repo),
          inject: [DOCTOR_PROFILE_REPOSITORY],
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

  it('POST /doctors rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer())
      .post('/doctors')
      .send({ licenseNumber: 'LIC-1', specialty: 'Cardiology' })
      .expect(401);

    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('POST /doctors registers a profile for the authenticated caller\'s own account', async () => {
    const response = await request(app.getHttpServer())
      .post('/doctors')
      .set('Authorization', `Bearer ${EXISTING_ACCOUNT_TOKEN}`)
      .send({ licenseNumber: 'LIC-1', specialty: 'Cardiology' })
      .expect(201);

    assert.equal(response.body.data.specialty, 'Cardiology');
    assert.equal(response.body.data.accountId, existingAccountId);
    assert.ok(response.body.meta.requestId);

    registeredProfileId = response.body.data.id;
  });

  it('POST /doctors rejects a second profile for the same account with 409', async () => {
    const response = await request(app.getHttpServer())
      .post('/doctors')
      .set('Authorization', `Bearer ${EXISTING_ACCOUNT_TOKEN}`)
      .send({ licenseNumber: 'LIC-2', specialty: 'Dermatology' })
      .expect(409);

    assert.equal(response.body.error.code, 'CONFLICT');
  });

  it('POST /doctors rejects an unknown account with 404', async () => {
    const response = await request(app.getHttpServer())
      .post('/doctors')
      .set('Authorization', `Bearer ${UNKNOWN_ACCOUNT_TOKEN}`)
      .send({
        licenseNumber: 'LIC-3',
        specialty: 'Oncology',
      })
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('POST /doctors rejects an empty specialty with a structured validation error', async () => {
    const response = await request(app.getHttpServer())
      .post('/doctors')
      .set('Authorization', `Bearer ${UNKNOWN_ACCOUNT_TOKEN}`)
      .send({ licenseNumber: 'LIC-4', specialty: '' })
      .expect(400);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it('POST /doctors rejects a publications entry missing its required title', async () => {
    const response = await request(app.getHttpServer())
      .post('/doctors')
      .set('Authorization', `Bearer ${UNKNOWN_ACCOUNT_TOKEN}`)
      .send({
        licenseNumber: 'LIC-5',
        specialty: 'Cardiology',
        publications: [{}],
      })
      .expect(400);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it('GET /doctors/:id returns 404 for a well-formed but unknown id', async () => {
    const response = await request(app.getHttpServer())
      .get('/doctors/33333333-3333-4333-8333-333333333333')
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('GET /doctors/:id is public and requires no bearer token', async () => {
    const found = await request(app.getHttpServer())
      .get(`/doctors/${registeredProfileId}`)
      .expect(200);
    assert.equal(found.body.data.specialty, 'Cardiology');
  });

  it('PATCH /doctors/:id rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/doctors/${registeredProfileId}`)
      .send({ specialty: 'General Practice' })
      .expect(401);

    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('PATCH /doctors/:id rejects updating a profile owned by a different doctor', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/doctors/${registeredProfileId}`)
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ specialty: 'General Practice' })
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('PATCH /doctors/:id updates the registered profile for its owner', async () => {
    const updated = await request(app.getHttpServer())
      .patch(`/doctors/${registeredProfileId}`)
      .set('Authorization', `Bearer ${EXISTING_ACCOUNT_TOKEN}`)
      .send({ specialty: 'General Practice' })
      .expect(200);

    assert.equal(updated.body.data.specialty, 'General Practice');
  });

  it('GET /doctors/me rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/doctors/me').expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /doctors/me returns 404 when no profile is registered for the account', async () => {
    const response = await request(app.getHttpServer())
      .get('/doctors/me')
      .set('Authorization', `Bearer ${OTHER_VALID_TOKEN}`)
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('GET /doctors/me returns the registered profile composed with the account', async () => {
    const response = await request(app.getHttpServer())
      .get('/doctors/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.accountId, meAccountId);
    assert.equal(response.body.data.fullName, 'Nourhan Adel');
    assert.equal(response.body.data.email, 'nourhan.adel@example.com');
    assert.equal(response.body.data.licenseNumber, 'LIC-12345');
    assert.equal(response.body.data.specialty, 'Cardiology');
    assert.ok(response.body.meta.requestId);
  });

  it('PATCH /doctors/me updates the caller-owned profile and returns it composed with the account', async () => {
    const response = await request(app.getHttpServer())
      .patch('/doctors/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ specialty: 'Pediatric Cardiology', yearsOfExperience: 9 })
      .expect(200);

    assert.equal(response.body.data.specialty, 'Pediatric Cardiology');
    assert.equal(response.body.data.yearsOfExperience, 9);
    assert.equal(response.body.data.fullName, 'Nourhan Adel');
  });

  it('PATCH /doctors/me returns 404 when no profile is registered for the account', async () => {
    const response = await request(app.getHttpServer())
      .patch('/doctors/me')
      .set('Authorization', `Bearer ${OTHER_VALID_TOKEN}`)
      .send({ specialty: 'Dermatology' })
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });
});
