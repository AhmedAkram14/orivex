import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { NotFoundError, ConflictError } from '../../../../../shared/errors/app-error.js';
import { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { Account } from '../../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../../identity/domain/repositories/account.repository.js';
import { DisplayName } from '../../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../../identity/domain/value-objects/email-address.value-object.js';
import type { DoctorProfile } from '../../../domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../domain/repositories/doctor-profile.repository.js';

import { RegisterDoctorProfileCommand } from './register-doctor-profile.command.js';
import { RegisterDoctorProfileUseCase } from './register-doctor-profile.use-case.js';

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

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  public readonly saved: DoctorProfile[] = [];
  private existingAccountId: string | undefined;

  seedExistingAccountId(accountId: string): void {
    this.existingAccountId = accountId;
  }
  findById(): Promise<DoctorProfile | null> {
    return Promise.resolve(null);
  }
  findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    if (this.existingAccountId === accountId) {
      return Promise.resolve({} as DoctorProfile);
    }
    return Promise.resolve(null);
  }
  save(profile: DoctorProfile): Promise<void> {
    this.saved.push(profile);
    return Promise.resolve();
  }
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}

  subscribe(): void {}
}

function buildAccount(): Account {
  return Account.register({
    email: EmailAddress.create('doc@example.com'),
    role: AccountRole.Doctor,
    displayName: DisplayName.create('Dr. Test'),
  });
}

describe('RegisterDoctorProfileUseCase', () => {
  let account: Account;
  let doctorRepo: FakeDoctorProfileRepository;
  let getAccountByIdUseCase: GetAccountByIdUseCase;
  let useCase: RegisterDoctorProfileUseCase;

  beforeEach(() => {
    account = buildAccount();
    doctorRepo = new FakeDoctorProfileRepository();
    getAccountByIdUseCase = new GetAccountByIdUseCase(new FakeAccountRepository(account));
    useCase = new RegisterDoctorProfileUseCase(doctorRepo, new NoopDispatcher(), getAccountByIdUseCase);
  });

  it('registers a doctor profile for an existing account', async () => {
    const profile = await useCase.execute(
      new RegisterDoctorProfileCommand({
        accountId: account.getId().toString(),
        licenseNumber: 'LIC-123',
        specialty: 'Cardiology',
      }),
    );

    assert.equal(profile.getSpecialty(), 'Cardiology');
    assert.equal(doctorRepo.saved.length, 1);
  });

  it('throws NotFoundError when the account does not exist', async () => {
    const useCaseWithMissingAccount = new RegisterDoctorProfileUseCase(
      doctorRepo,
      new NoopDispatcher(),
      new GetAccountByIdUseCase(new FakeAccountRepository(null)),
    );

    await assert.rejects(
      () =>
        useCaseWithMissingAccount.execute(
          new RegisterDoctorProfileCommand({
            accountId: '11111111-1111-4111-8111-111111111111',
            licenseNumber: 'LIC-123',
            specialty: 'Cardiology',
          }),
        ),
      NotFoundError,
    );
    assert.equal(doctorRepo.saved.length, 0);
  });

  it('throws ConflictError when the account already has a doctor profile', async () => {
    doctorRepo.seedExistingAccountId(account.getId().toString());

    await assert.rejects(
      () =>
        useCase.execute(
          new RegisterDoctorProfileCommand({
            accountId: account.getId().toString(),
            licenseNumber: 'LIC-123',
            specialty: 'Cardiology',
          }),
        ),
      ConflictError,
    );
    assert.equal(doctorRepo.saved.length, 0);
  });
});
