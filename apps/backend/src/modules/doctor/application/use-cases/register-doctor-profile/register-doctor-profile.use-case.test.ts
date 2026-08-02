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
import { ProfessionalRank } from '../../../domain/enums/professional-rank.enum.js';
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

  findAll(): Promise<{ accounts: Account[]; total: number }> {
    return Promise.resolve({ accounts: [], total: 0 });
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

  const SPECIALTY_ID = '11111111-1111-4111-8111-111111111111';

  it('registers a doctor profile for an existing account', async () => {
    const profile = await useCase.execute(
      new RegisterDoctorProfileCommand({
        accountId: account.getId().toString(),
        licenseNumber: 'LIC-123',
        specialtyId: SPECIALTY_ID,
      }),
    );

    assert.equal(profile.getSpecialtyId(), SPECIALTY_ID);
    assert.equal(doctorRepo.saved.length, 1);
  });

  it('registers with an optional hospitalId (Doctor Onboarding)', async () => {
    const profile = await useCase.execute(
      new RegisterDoctorProfileCommand({
        accountId: account.getId().toString(),
        licenseNumber: 'LIC-123',
        specialtyId: SPECIALTY_ID,
        hospitalId: '77777777-7777-4777-8777-777777777777',
      }),
    );

    assert.equal(profile.getHospitalId(), '77777777-7777-4777-8777-777777777777');
  });

  it('registers with no hospitalId when omitted', async () => {
    const profile = await useCase.execute(
      new RegisterDoctorProfileCommand({
        accountId: account.getId().toString(),
        licenseNumber: 'LIC-123',
        specialtyId: SPECIALTY_ID,
      }),
    );

    assert.equal(profile.getHospitalId(), undefined);
  });

  it('registers with professionalRank/licenseExpiryDate/departmentId (Onboarding Redesign Stage O.3)', async () => {
    const licenseExpiryDate = new Date('2030-01-01');
    const profile = await useCase.execute(
      new RegisterDoctorProfileCommand({
        accountId: account.getId().toString(),
        licenseNumber: 'LIC-123',
        specialtyId: '55555555-5555-4555-8555-555555555555',
        professionalRank: ProfessionalRank.Registrar,
        licenseExpiryDate,
        hospitalId: '77777777-7777-4777-8777-777777777777',
        departmentId: '66666666-6666-4666-8666-666666666666',
      }),
    );

    assert.equal(profile.getSpecialtyId(), '55555555-5555-4555-8555-555555555555');
    assert.equal(profile.getProfessionalRank(), ProfessionalRank.Registrar);
    assert.deepEqual(profile.getLicenseExpiryDate(), licenseExpiryDate);
    assert.equal(profile.getDepartmentId(), '66666666-6666-4666-8666-666666666666');
  });

  it('registers with insuranceProviders and workExperience (Doctor Profile Redesign)', async () => {
    const profile = await useCase.execute(
      new RegisterDoctorProfileCommand({
        accountId: account.getId().toString(),
        licenseNumber: 'LIC-123',
        specialtyId: SPECIALTY_ID,
        insuranceProviders: ['Misr Insurance', 'AXA', 'Allianz'],
        workExperience: [
          {
            organizationName: 'Cairo Medical Center',
            position: 'Consultant Orthopedic Surgeon',
            startDate: new Date('2021-01-01'),
          },
        ],
      }),
    );

    assert.deepEqual(profile.getInsuranceProviders(), ['Misr Insurance', 'AXA', 'Allianz']);
    assert.equal(profile.getWorkExperience().length, 1);
    assert.equal(profile.getWorkExperience()[0].getOrganizationName(), 'Cairo Medical Center');
    assert.equal(profile.getWorkExperience()[0].getEndDate(), undefined);
  });

  it('registers with no insuranceProviders/workExperience when omitted', async () => {
    const profile = await useCase.execute(
      new RegisterDoctorProfileCommand({
        accountId: account.getId().toString(),
        licenseNumber: 'LIC-123',
        specialtyId: SPECIALTY_ID,
      }),
    );

    assert.deepEqual(profile.getInsuranceProviders(), []);
    assert.deepEqual(profile.getWorkExperience(), []);
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
            specialtyId: SPECIALTY_ID,
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
            specialtyId: SPECIALTY_ID,
          }),
        ),
      ConflictError,
    );
    assert.equal(doctorRepo.saved.length, 0);
  });
});
