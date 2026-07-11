import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { AccountRepository } from '../../../domain/repositories/account.repository.js';
import { AccountId } from '../../../domain/value-objects/account-id.value-object.js';
import type { DomainEventDispatcher } from '../../ports/domain-event-dispatcher.port.js';
import { ACCOUNT_REPOSITORY, DOMAIN_EVENT_DISPATCHER } from '../../ports/tokens.js';

import type { SuspendAccountCommand } from './suspend-account.command.js';

// Orchestrates: load -> Account.suspend() (idempotent, throws
// AccountClosedError if terminal — both handled entirely by the domain) ->
// persist -> dispatch events.
@Injectable()
export class SuspendAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository,
    @Inject(DOMAIN_EVENT_DISPATCHER) private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: SuspendAccountCommand): Promise<void> {
    const id = AccountId.create(command.accountId);
    const account = await this.accountRepository.findById(id);

    if (!account) {
      throw new NotFoundError('Account not found.');
    }

    account.suspend();

    await this.accountRepository.save(account);
    await this.eventDispatcher.dispatch(account.releaseDomainEvents());
  }
}
