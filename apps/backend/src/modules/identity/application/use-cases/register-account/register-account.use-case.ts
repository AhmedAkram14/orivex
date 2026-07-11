import { ConflictError } from '../../../../../shared/errors/app-error.js';
import { Account } from '../../../domain/entities/account.entity.js';
import type { AccountRepository } from '../../../domain/repositories/account.repository.js';
import { DisplayName } from '../../../domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../domain/value-objects/email-address.value-object.js';
import type { DomainEventDispatcher } from '../../ports/domain-event-dispatcher.port.js';

import type { RegisterAccountCommand } from './register-account.command.js';

// Plain TypeScript class — no NestJS dependency. DI wiring (mapping
// ACCOUNT_REPOSITORY/DOMAIN_EVENT_DISPATCHER tokens to these constructor
// params) lives entirely in identity.module.ts, not here.
//
// Orchestrates: uniqueness check (needs repository access, which is why this
// wasn't a domain service — Sprint 1.1A deferred exactly this to the
// application layer) -> Account.register() -> persist -> dispatch events.
export class RegisterAccountUseCase {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: RegisterAccountCommand): Promise<Account> {
    const email = EmailAddress.create(command.email);

    // This check-then-act is a fast-fail UX nicety, not the actual
    // uniqueness guarantee: two concurrent registrations for the same email
    // can both pass this check before either saves. Real enforcement must
    // come from a unique constraint at the persistence layer (Sprint 1.1C),
    // with this use case translating that constraint violation into the same
    // ConflictError below.
    const existing = await this.accountRepository.findByEmail(email);
    if (existing) {
      // ConflictError (shared/errors), not a raw domain exception: the
      // global exception filter only maps AppError/HttpException to a
      // sensible HTTP status — anything else falls through to a generic 500,
      // hiding a real, actionable "already exists" as a server malfunction.
      throw new ConflictError('An account with this email address already exists.');
    }

    const account = Account.register({
      email,
      keycloakId: command.keycloakId,
      role: command.role,
      displayName: DisplayName.create(command.displayName),
      preferredLanguage: command.preferredLanguage,
    });

    await this.accountRepository.save(account);
    await this.eventDispatcher.dispatch(account.releaseDomainEvents());

    return account;
  }
}
