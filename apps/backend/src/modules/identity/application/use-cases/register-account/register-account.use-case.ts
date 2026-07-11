import { Account } from '../../../domain/entities/account.entity.js';
import { IdentityDomainError } from '../../../domain/exceptions/identity-domain.error.js';
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

    const existing = await this.accountRepository.findByEmail(email);
    if (existing) {
      throw new IdentityDomainError('An account with this email address already exists.');
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
