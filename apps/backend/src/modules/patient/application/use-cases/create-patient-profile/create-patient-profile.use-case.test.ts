import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { ConflictError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { Account } from '../../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../../identity/domain/repositories/account.repository.js';
import { DisplayName } from '../../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../../identity/domain/value-objects/email-address.value-object.js';
import type { PatientProfile } from '../../../domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../domain/repositories/patient-profile.repository.js';

import { CreatePatientProfileCommand } from './create-patient-profile.command.js';
import { CreatePatientProfileUseCase } from './create-patient-profile.use-case.js';

class FakeAccountRepository implements AccountRepository {
  constructor(private readonly account: Account | null) {}
  findById(): Promise<Account | null> {
    return Promise.resolve(this.account);
  }
  findByEmail(): Promise<Account | null> {
    return Promise.resolve(null);
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
}

class FakePatientProfileRepository implements PatientProfileRepository {
  public readonly saved: PatientProfile[] = [];
  private existingAccountId: string | undefined;

  seedExistingAccountId(accountId: string): void {
    this.existingAccountId = accountId;
  }
  findById(): Promise<PatientProfile | null> {
    return Promise.resolve(null);
  }
  findByAccountId(accountId: string): Promise<PatientProfile | null> {
    if (this.existingAccountId === accountId) {
      return Promise.resolve({} as PatientProfile);
    }
    return Promise.resolve(null);
  }
  save(profile: PatientProfile): Promise<void> {
    this.saved.push(profile);
    return Promise.resolve();
  }
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}
}

function buildAccount(): Account {
  return Account.register({
    email: EmailAddress.create('patient@example.com'),
    keycloakId: 'kc-patient',
    role: AccountRole.Patient,
    displayName: DisplayName.create('Pat Test'),
  });
}

describe('CreatePatientProfileUseCase', () => {
  let account: Account;
  let patientRepo: FakePatientProfileRepository;
  let getAccountByIdUseCase: GetAccountByIdUseCase;
  let useCase: CreatePatientProfileUseCase;

  beforeEach(() => {
    account = buildAccount();
    patientRepo = new FakePatientProfileRepository();
    getAccountByIdUseCase = new GetAccountByIdUseCase(new FakeAccountRepository(account));
    useCase = new CreatePatientProfileUseCase(patientRepo, new NoopDispatcher(), getAccountByIdUseCase);
  });

  it('creates a patient profile shell for an existing account', async () => {
    const profile = await useCase.execute(
      new CreatePatientProfileCommand({ accountId: account.getId().toString() }),
    );

    assert.equal(profile.getAccountId(), account.getId().toString());
    assert.equal(patientRepo.saved.length, 1);
  });

  it('throws NotFoundError when the account does not exist', async () => {
    const useCaseWithMissingAccount = new CreatePatientProfileUseCase(
      patientRepo,
      new NoopDispatcher(),
      new GetAccountByIdUseCase(new FakeAccountRepository(null)),
    );

    await assert.rejects(
      () =>
        useCaseWithMissingAccount.execute(
          new CreatePatientProfileCommand({ accountId: '11111111-1111-4111-8111-111111111111' }),
        ),
      NotFoundError,
    );
    assert.equal(patientRepo.saved.length, 0);
  });

  it('throws ConflictError when the account already has a patient profile', async () => {
    patientRepo.seedExistingAccountId(account.getId().toString());

    await assert.rejects(
      () => useCase.execute(new CreatePatientProfileCommand({ accountId: account.getId().toString() })),
      ConflictError,
    );
    assert.equal(patientRepo.saved.length, 0);
  });
});
