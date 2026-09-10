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
import { HEALTH_PASSPORT_ENTRY_REPOSITORY, PATIENT_PROFILE_REPOSITORY } from '../../application/ports/tokens.js';
import { CreatePatientProfileUseCase } from '../../application/use-cases/create-patient-profile/create-patient-profile.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { UpdatePatientProfileUseCase } from '../../application/use-cases/update-patient-profile/update-patient-profile.use-case.js';
import { RecordHealthPassportEntryUseCase } from '../../application/use-cases/record-health-passport-entry/record-health-passport-entry.use-case.js';
import { ListHealthPassportEntriesForPatientUseCase } from '../../application/use-cases/list-health-passport-entries-for-patient/list-health-passport-entries-for-patient.use-case.js';
import { DeleteHealthPassportEntryUseCase } from '../../application/use-cases/delete-health-passport-entry/delete-health-passport-entry.use-case.js';
import type { HealthPassportEntry } from '../../domain/entities/health-passport-entry.entity.js';
import type { PatientProfile } from '../../domain/entities/patient-profile.entity.js';
import type { HealthPassportEntryRepository } from '../../domain/repositories/health-passport-entry.repository.js';
import type { PatientProfileRepository } from '../../domain/repositories/patient-profile.repository.js';

import { PatientProfileController } from './patient-profile.controller.js';

const VALID_TOKEN = 'valid-patient-token';

class InMemoryAccountRepository implements AccountRepository {
  constructor(private readonly account: Account) {}
  async findById(id: AccountId): Promise<Account | null> {
    return this.account.getId().equals(id) ? this.account : null;
  }
  async findByEmail(): Promise<Account | null> {
    return null;
  }

  findAll(): Promise<{ accounts: Account[]; total: number }> {
    return Promise.resolve({ accounts: [], total: 0 });
  }
  async save(): Promise<void> {}
}

class InMemoryPatientProfileRepository implements PatientProfileRepository {
  private readonly byId = new Map<string, PatientProfile>();

  async findById(id: string): Promise<PatientProfile | null> {
    return this.byId.get(id) ?? null;
  }
  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    for (const profile of this.byId.values()) {
      if (profile.getAccountId() === accountId) {
        return profile;
      }
    }
    return null;
  }
  async save(profile: PatientProfile): Promise<void> {
    this.byId.set(profile.getId(), profile);
  }
}

class InMemoryHealthPassportEntryRepository implements HealthPassportEntryRepository {
  private readonly byId = new Map<string, HealthPassportEntry>();

  async findById(id: string): Promise<HealthPassportEntry | null> {
    return this.byId.get(id) ?? null;
  }
  async findByPatientId(patientId: string): Promise<HealthPassportEntry[]> {
    return [...this.byId.values()].filter((entry) => entry.getPatientId() === patientId);
  }
  async save(entry: HealthPassportEntry): Promise<void> {
    this.byId.set(entry.getId(), entry);
  }
  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}

class NoopDomainEventDispatcher {
  async dispatch(): Promise<void> {
    // intentionally empty
  }
  subscribe(): void {}
}

class FakeJwtSigner implements JwtSignerPort {
  constructor(private readonly accountId: string) {}
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    if (token !== VALID_TOKEN) {
      throw new Error('invalid token');
    }
    return { accountId: this.accountId, role: AccountRole.Patient };
  }
}

describe('PatientProfileController (integration)', () => {
  let app: INestApplication;
  let existingAccountId: string;

  before(async () => {
    const account = Account.register({
      email: EmailAddress.create('patient@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Amina Youssef'),
    });
    existingAccountId = account.getId().toString();

    const moduleRef = await Test.createTestingModule({
      controllers: [PatientProfileController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        { provide: JWT_SIGNER, useFactory: () => new FakeJwtSigner(existingAccountId) },
        { provide: PATIENT_PROFILE_REPOSITORY, useClass: InMemoryPatientProfileRepository },
        { provide: DOMAIN_EVENT_DISPATCHER, useClass: NoopDomainEventDispatcher },
        {
          provide: GetAccountByIdUseCase,
          useFactory: () => new GetAccountByIdUseCase(new InMemoryAccountRepository(account)),
        },
        {
          provide: CreatePatientProfileUseCase,
          useFactory: (
            repo: PatientProfileRepository,
            dispatcher: NoopDomainEventDispatcher,
            getAccountByIdUseCase: GetAccountByIdUseCase,
          ) => new CreatePatientProfileUseCase(repo, dispatcher, getAccountByIdUseCase),
          inject: [PATIENT_PROFILE_REPOSITORY, DOMAIN_EVENT_DISPATCHER, GetAccountByIdUseCase],
        },
        {
          provide: UpdatePatientProfileUseCase,
          useFactory: (repo: PatientProfileRepository, dispatcher: NoopDomainEventDispatcher) =>
            new UpdatePatientProfileUseCase(repo, dispatcher),
          inject: [PATIENT_PROFILE_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
        },
        {
          provide: GetPatientProfileByAccountIdUseCase,
          useFactory: (repo: PatientProfileRepository) => new GetPatientProfileByAccountIdUseCase(repo),
          inject: [PATIENT_PROFILE_REPOSITORY],
        },
        { provide: HEALTH_PASSPORT_ENTRY_REPOSITORY, useClass: InMemoryHealthPassportEntryRepository },
        {
          provide: RecordHealthPassportEntryUseCase,
          useFactory: (repo: HealthPassportEntryRepository) => new RecordHealthPassportEntryUseCase(repo),
          inject: [HEALTH_PASSPORT_ENTRY_REPOSITORY],
        },
        {
          provide: ListHealthPassportEntriesForPatientUseCase,
          useFactory: (repo: HealthPassportEntryRepository) => new ListHealthPassportEntriesForPatientUseCase(repo),
          inject: [HEALTH_PASSPORT_ENTRY_REPOSITORY],
        },
        {
          provide: DeleteHealthPassportEntryUseCase,
          useFactory: (repo: HealthPassportEntryRepository) => new DeleteHealthPassportEntryUseCase(repo),
          inject: [HEALTH_PASSPORT_ENTRY_REPOSITORY],
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

  it('GET /patients/me rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/patients/me').expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  // Onboarding Redesign (2026-07-21 proposal, Stage O.5): placed before any
  // GET /patients/me call in this suite so it reflects the true pre-vivify
  // state -- proves this check never itself creates the row.
  it('GET /patients/me/exists rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/patients/me/exists').expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /patients/me/exists reports false before any profile has been created, without creating one', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients/me/exists')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.exists, false);
  });

  it('GET /patients/me lazily creates and returns a profile on first read', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.accountId, existingAccountId);
    assert.equal(response.body.data.fullName, 'Amina Youssef');
    assert.equal(response.body.data.email, 'patient@example.com');
    assert.deepEqual(response.body.data.emergencyContacts, []);
    assert.ok(response.body.meta.requestId);
  });

  it('GET /patients/me/exists reports true once a profile exists', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients/me/exists')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.exists, true);
  });

  it('GET /patients/me returns the same profile id on a second call (not recreated)', async () => {
    const first = await request(app.getHttpServer())
      .get('/patients/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);
    const second = await request(app.getHttpServer())
      .get('/patients/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.equal(first.body.data.id, second.body.data.id);
  });

  it('PATCH /patients/me updates emergencyContacts', async () => {
    const response = await request(app.getHttpServer())
      .patch('/patients/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        emergencyContacts: [{ name: 'Mona Youssef', relationship: 'sibling', phoneNumber: '+20 100 333 4444' }],
      })
      .expect(200);

    assert.equal(response.body.data.emergencyContacts.length, 1);
    assert.equal(response.body.data.emergencyContacts[0].name, 'Mona Youssef');
  });

  it('PATCH /patients/me rejects an emergency contact with an empty name', async () => {
    const response = await request(app.getHttpServer())
      .patch('/patients/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ emergencyContacts: [{ name: '', relationship: 'sibling', phoneNumber: '123' }] })
      .expect(400);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it('PATCH /patients/me updates the health passport notes fields', async () => {
    const response = await request(app.getHttpServer())
      .patch('/patients/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        lifestyleNotes: 'Non-smoker, exercises weekly.',
        nutritionNotes: 'Vegetarian.',
        exerciseNotes: 'Runs 5k twice a week.',
        mentalHealthNotes: 'No history of anxiety or depression.',
      })
      .expect(200);

    assert.equal(response.body.data.lifestyleNotes, 'Non-smoker, exercises weekly.');
    assert.equal(response.body.data.nutritionNotes, 'Vegetarian.');
    assert.equal(response.body.data.exerciseNotes, 'Runs 5k twice a week.');
    assert.equal(response.body.data.mentalHealthNotes, 'No history of anxiety or depression.');
  });

  it('POST /patients/me/health-passport-entries records an entry, GET lists it, DELETE removes it', async () => {
    const created = await request(app.getHttpServer())
      .post('/patients/me/health-passport-entries')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ category: 'vaccination', title: 'MMR', detail: 'Second dose', occurredAt: '2020-01-01T00:00:00.000Z' })
      .expect(201);

    assert.equal(created.body.data.category, 'vaccination');
    assert.equal(created.body.data.title, 'MMR');

    const listed = await request(app.getHttpServer())
      .get('/patients/me/health-passport-entries')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.ok(listed.body.data.some((entry: { id: string }) => entry.id === created.body.data.id));

    await request(app.getHttpServer())
      .delete(`/patients/me/health-passport-entries/${created.body.data.id}`)
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(204);

    const afterDelete = await request(app.getHttpServer())
      .get('/patients/me/health-passport-entries')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.ok(!afterDelete.body.data.some((entry: { id: string }) => entry.id === created.body.data.id));
  });

  it('POST /patients/me/health-passport-entries rejects an empty title', async () => {
    const response = await request(app.getHttpServer())
      .post('/patients/me/health-passport-entries')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ category: 'surgery', title: '' })
      .expect(400);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it('DELETE /patients/me/health-passport-entries/:id returns 404 for an unknown id', async () => {
    const response = await request(app.getHttpServer())
      .delete('/patients/me/health-passport-entries/99999999-9999-4999-8999-999999999999')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });
});
