import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { Account } from '../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../identity/domain/repositories/account.repository.js';
import type { AccountId } from '../../../identity/domain/value-objects/account-id.value-object.js';
import { DisplayName } from '../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../identity/domain/value-objects/email-address.value-object.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';

import { PublicPatientsController } from './public-patients.controller.js';

class InMemoryAccountRepository implements AccountRepository {
  private readonly byId = new Map<string, Account>();
  constructor(accounts: Account[]) {
    for (const account of accounts) this.byId.set(account.getId().toString(), account);
  }
  async findById(id: AccountId): Promise<Account | null> {
    return this.byId.get(id.toString()) ?? null;
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
  constructor(private readonly profile: PatientProfile) {}
  async findById(id: string): Promise<PatientProfile | null> {
    return this.profile.getId() === id ? this.profile : null;
  }
  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    return this.profile.getAccountId() === accountId ? this.profile : null;
  }
  async save(): Promise<void> {}
}

// Public/Protected Information Architecture split: this controller must stay
// the ONLY genuinely public patient read forever -- name and avatar, nothing
// else. Clinical data (blood type, allergies, prescriptions, medical
// history, documents) lives exclusively behind DoctorPatientChartController
// (ClinicalModule), which requires sign-in AND a real doctor-patient
// relationship. This test is the guardrail against that boundary quietly
// eroding again.
describe('PublicPatientsController (integration)', () => {
  let app: INestApplication;
  let patient: PatientProfile;

  before(async () => {
    const patientAccount = Account.register({
      email: EmailAddress.create('patient@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Nadia Fawzy'),
    });
    patient = PatientProfile.create({ accountId: patientAccount.getId().toString() });
    // Give the profile real clinical fields so a leak would be detectable.
    patient.update({ bloodType: undefined, allergies: 'Penicillin', chronicDiseases: 'Asthma' });

    const moduleRef = await Test.createTestingModule({
      controllers: [PublicPatientsController],
      providers: [
        PinoLoggerService,
        {
          provide: GetPatientProfileByIdUseCase,
          useFactory: () => new GetPatientProfileByIdUseCase(new InMemoryPatientProfileRepository(patient)),
        },
        {
          provide: GetAccountByIdUseCase,
          useFactory: () => new GetAccountByIdUseCase(new InMemoryAccountRepository([patientAccount])),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter(moduleRef.get(PinoLoggerService)));
    await app.init();
  });

  after(async () => {
    await app.close();
  });

  it('GET /public/patients/:id is reachable with no Authorization header at all', async () => {
    const response = await request(app.getHttpServer()).get(`/public/patients/${patient.getId()}`).expect(200);
    assert.equal(response.body.data.fullName, 'Nadia Fawzy');
  });

  it('GET /public/patients/:id response contains ONLY the safe fields -- no clinical/private data of any kind', async () => {
    const response = await request(app.getHttpServer()).get(`/public/patients/${patient.getId()}`).expect(200);

    const keys = Object.keys(response.body.data).sort();
    assert.deepEqual(keys, ['fullName', 'patientProfileId'].sort());

    const serialized = JSON.stringify(response.body.data);
    assert.ok(!serialized.includes('Penicillin'), 'allergies must never appear in the public response');
    assert.ok(!serialized.includes('Asthma'), 'chronic diseases must never appear in the public response');
  });

  for (const clinicalPath of ['profile', 'appointments', 'medical-records', 'prescriptions', 'documents']) {
    it(`GET /public/patients/:id/${clinicalPath} does not exist -- the public controller was never given clinical routes`, async () => {
      const response = await request(app.getHttpServer()).get(`/public/patients/${patient.getId()}/${clinicalPath}`);
      assert.equal(response.status, 404);
    });
  }
});
