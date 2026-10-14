import { ageInYears, cairoToday, calendarDay } from '../../../../../shared/date/calendar-date.js';
import { NotFoundError, ValidationError } from '../../../../../shared/errors/app-error.js';
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
// The oldest age a date of birth may give -- a bound on typos (a year off by a century), not a policy.
export const MAX_AGE_YEARS = 120;

// A date of birth must be a real past day: not after today (Cairo) and no more than 120 years ago. The
// doctor application checks its own, narrower age range when the application is submitted.
function assertPlausibleDateOfBirth(dateOfBirth: Date | undefined, now: Date): void {
  if (!dateOfBirth) return;
  const day = calendarDay(dateOfBirth);
  const today = cairoToday(now);
  if (day > today) {
    throw new ValidationError('The date of birth cannot be in the future.', 'INVALID_DATE_OF_BIRTH');
  }
  if (ageInYears(day, today) > MAX_AGE_YEARS) {
    throw new ValidationError(`The date of birth cannot be more than ${MAX_AGE_YEARS} years ago.`, 'INVALID_DATE_OF_BIRTH');
  }
}

export class UpdatePersonalProfileUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  async execute(command: UpdatePersonalProfileCommand): Promise<Account> {
    const id = AccountId.create(command.accountId);
    const account = await this.accountRepository.findById(id);

    if (!account) {
      throw new NotFoundError('Account not found.');
    }

    assertPlausibleDateOfBirth(command.dateOfBirth ?? undefined, new Date());

    account.updatePersonalProfile({
      dateOfBirth: command.dateOfBirth,
      gender: command.gender,
      nationalityId: command.nationalityId,
      address: command.address,
      avatarUrl: command.avatarUrl,
      phoneNumber: command.phoneNumber,
    });

    await this.accountRepository.save(account);

    return account;
  }
}
