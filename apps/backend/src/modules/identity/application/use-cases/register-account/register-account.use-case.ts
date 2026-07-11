import { Inject, Injectable } from '@nestjs/common';

import { Account } from '../../../domain/entities/account.entity.js';
import { IdentityDomainError } from '../../../domain/exceptions/identity-domain.error.js';
import type { AccountRepository } from '../../../domain/repositories/account.repository.js';
import { DisplayName } from '../../../domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../domain/value-objects/email-address.value-object.js';
import type { DomainEventDispatcher } from '../../ports/domain-event-dispatcher.port.js';
import { ACCOUNT_REPOSITORY, DOMAIN_EVENT_DISPATCHER } from '../../ports/tokens.js';

import type { RegisterAccountCommand } from './register-account.command.js';

// Orchestrates: uniqueness check (needs repository access, which is why this
// wasn't a domain service — Sprint 1.1A deferred exactly this to the
// application layer) -> Account.register() -> persist -> dispatch events.
@Injectable()
export class RegisterAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository,
    @Inject(DOMAIN_EVENT_DISPATCHER) private readonly eventDispatcher: DomainEventDispatcher,
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
