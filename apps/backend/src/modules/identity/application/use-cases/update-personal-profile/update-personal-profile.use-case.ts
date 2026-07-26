import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { Account } from '../../../domain/entities/account.entity.js';
import type { AccountRepository } from '../../../domain/repositories/account.repository.js';
import { AccountId } from '../../../domain/value-objects/account-id.value-object.js';

import type { UpdatePersonalProfileCommand } from './update-personal-profile.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// identity.module.ts only.
//
// Onboarding Redesign (2026-07-21 proposal, §0a/§14 Stage O.1): backs the
// shared "Personal Info" step both Patient and Doctor onboarding submit
// through -- one use case, one endpoint, consumed by two different flows.
export class UpdatePersonalProfileUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  async execute(command: UpdatePersonalProfileCommand): Promise<Account> {
    const id = AccountId.create(command.accountId);
    const account = await this.accountRepository.findById(id);

    if (!account) {
      throw new NotFoundError('Account not found.');
    }

    account.updatePersonalProfile({
      dateOfBirth: command.dateOfBirth,
      gender: command.gender,
      nationalityId: command.nationalityId,
      address: command.address,
    });

    await this.accountRepository.save(account);

    return account;
  }
}
