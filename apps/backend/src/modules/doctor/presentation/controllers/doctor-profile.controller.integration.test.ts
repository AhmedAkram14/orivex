import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../../../shared/domain/tokens.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { Account } from '../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../identity/domain/repositories/account.repository.js';
import type { AccountId } from '../../../identity/domain/value-objects/account-id.value-object.js';
import { DisplayName } from '../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../identity/domain/value-objects/email-address.value-object.js';
import { DOCTOR_PROFILE_REPOSITORY } from '../../application/ports/tokens.js';
import { GetDoctorProfileByIdUseCase } from '../../application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { RegisterDoctorProfileUseCase } from '../../application/use-cases/register-doctor-profile/register-doctor-profile.use-case.js';
import { UpdateDoctorProfileUseCase } from '../../application/use-cases/update-doctor-profile/update-doctor-profile.use-case.js';
import type { DoctorProfile } from '../../domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../domain/repositories/doctor-profile.repository.js';

import { DoctorProfileController } from './doctor-profile.controller.js';

class InMemoryAccountRepository implements AccountRepository {
  constructor(private readonly account: Account) {}
  async findById(id: AccountId): Promise<Account | null> {
    return this.account.getId().equals(id) ? this.account : null;
  }
  async findByEmail(): Promise<Account | null> {
    return null;
  }
  async save(): Promise<void> {}
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
}

describe('DoctorProfileController (integration)', () => {
  let app: INestApplication;
  let existingAccountId: string;
  let registeredProfileId: string;

  before(async () => {
    const account = Account.register({
      email: EmailAddress.create('doctor@example.com'),
      keycloakId: 'kc-doctor',
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Dr. Test'),
    });
    existingAccountId = account.getId().toString();

    const moduleRef = await Test.createTestingModule({
      controllers: [DoctorProfileController],
      providers: [
        PinoLoggerService,
        { provide: DOCTOR_PROFILE_REPOSITORY, useClass: InMemoryDoctorProfileRepository },
        { provide: DOMAIN_EVENT_DISPATCHER, useClass: NoopDomainEventDispatcher },
        {
          provide: GetAccountByIdUseCase,
          useFactory: () => new GetAccountByIdUseCase(new InMemoryAccountRepository(account)),
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

  it('POST /doctors registers a profile for an existing account', async () => {
    const response = await request(app.getHttpServer())
      .post('/doctors')
      .send({ accountId: existingAccountId, licenseNumber: 'LIC-1', specialty: 'Cardiology' })
      .expect(201);

    assert.equal(response.body.data.specialty, 'Cardiology');
    assert.equal(response.body.data.accountId, existingAccountId);
    assert.ok(response.body.meta.requestId);

    registeredProfileId = response.body.data.id;
  });

  it('POST /doctors rejects a second profile for the same account with 409', async () => {
    const response = await request(app.getHttpServer())
      .post('/doctors')
      .send({ accountId: existingAccountId, licenseNumber: 'LIC-2', specialty: 'Dermatology' })
      .expect(409);

    assert.equal(response.body.error.code, 'CONFLICT');
  });

  it('POST /doctors rejects an unknown account with 404', async () => {
    const response = await request(app.getHttpServer())
      .post('/doctors')
      .send({
        accountId: '22222222-2222-4222-8222-222222222222',
        licenseNumber: 'LIC-3',
        specialty: 'Oncology',
      })
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('POST /doctors rejects an empty specialty with a structured validation error', async () => {
    const response = await request(app.getHttpServer())
      .post('/doctors')
      .send({ accountId: existingAccountId, licenseNumber: 'LIC-4', specialty: '' })
      .expect(400);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it('GET /doctors/:id returns 404 for a well-formed but unknown id', async () => {
    const response = await request(app.getHttpServer())
      .get('/doctors/33333333-3333-4333-8333-333333333333')
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('GET then PATCH /doctors/:id updates the registered profile', async () => {
    const found = await request(app.getHttpServer())
      .get(`/doctors/${registeredProfileId}`)
      .expect(200);
    assert.equal(found.body.data.specialty, 'Cardiology');

    const updated = await request(app.getHttpServer())
      .patch(`/doctors/${registeredProfileId}`)
      .send({ specialty: 'General Practice' })
      .expect(200);

    assert.equal(updated.body.data.specialty, 'General Practice');
  });
});
