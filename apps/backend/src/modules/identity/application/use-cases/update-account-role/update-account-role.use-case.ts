import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { Account } from '../../../domain/entities/account.entity.js';
import type { AccountRepository } from '../../../domain/repositories/account.repository.js';
import { AccountId } from '../../../domain/value-objects/account-id.value-object.js';

import type { UpdateAccountRoleCommand } from './update-account-role.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// identity.module.ts only.
//
// Orchestrates: load -> Account.changeRole() (idempotent, throws
// AccountClosedError if terminal — both handled entirely by the domain) ->
// persist -> dispatch events. Mirrors SuspendAccountUseCase's shape exactly.
export class UpdateAccountRoleUseCase {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: UpdateAccountRoleCommand): Promise<Account> {
    const id = AccountId.create(command.accountId);
    const account = await this.accountRepository.findById(id);

    if (!account) {
      throw new NotFoundError('Account not found.');
    }

    account.changeRole(command.newRole);

    await this.accountRepository.save(account);
    await this.eventDispatcher.dispatch(account.releaseDomainEvents());

    return account;
  }
}
