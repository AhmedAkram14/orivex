import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { Account } from '../../../domain/entities/account.entity.js';
import { AccountRole } from '../../../domain/enums/account-role.enum.js';
import { AccountStatus } from '../../../domain/enums/account-status.enum.js';
import { AccountClosedError } from '../../../domain/exceptions/account-closed.error.js';
import type { AccountRepository } from '../../../domain/repositories/account.repository.js';
import { DisplayName } from '../../../domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../domain/value-objects/email-address.value-object.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { NotFoundError } from '../../../../../shared/errors/app-error.js';

import { SuspendAccountCommand } from './suspend-account.command.js';
import { SuspendAccountUseCase } from './suspend-account.use-case.js';

class FakeAccountRepository implements AccountRepository {
  public readonly saved: Account[] = [];

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

  save(account: Account): Promise<void> {
    this.saved.push(account);
    return Promise.resolve();
  }
}

class FakeDomainEventDispatcher implements DomainEventDispatcher {
  public readonly dispatched: unknown[][] = [];

  dispatch(events: unknown[]): Promise<void> {
    this.dispatched.push(events);
    return Promise.resolve();
  }

  subscribe(): void {}
}

function buildActiveAccount(): Account {
  return Account.register({
    email: EmailAddress.create('active@example.com'),
    role: AccountRole.Patient,
    displayName: DisplayName.create('Active User'),
  });
}

describe('SuspendAccountUseCase', () => {
  let dispatcher: FakeDomainEventDispatcher;

  beforeEach(() => {
    dispatcher = new FakeDomainEventDispatcher();
  });

  it('suspends an existing active account, persists it, and dispatches AccountSuspended', async () => {
    const account = buildActiveAccount();
    account.releaseDomainEvents(); // clear the AccountCreated from registration
    const repository = new FakeAccountRepository(account);
    const useCase = new SuspendAccountUseCase(repository, dispatcher);

    await useCase.execute(new SuspendAccountCommand({ accountId: account.getId().toString() }));

    assert.equal(account.getStatus(), AccountStatus.Suspended);
    assert.equal(repository.saved.length, 1);
    assert.equal(dispatcher.dispatched.length, 1);
    const events = dispatcher.dispatched[0] as { eventName: string }[];
    assert.equal(events[0].eventName, 'identity.account.suspended');
  });

  it('throws NotFoundError when the account does not exist', async () => {
    const repository = new FakeAccountRepository(null);
    const useCase = new SuspendAccountUseCase(repository, dispatcher);

    await assert.rejects(
      () =>
        useCase.execute(new SuspendAccountCommand({ accountId: '11111111-1111-4111-8111-111111111111' })),
      NotFoundError,
    );

    assert.equal(repository.saved.length, 0);
    assert.equal(dispatcher.dispatched.length, 0);
  });

  it('propagates AccountClosedError for a closed account and does not persist or dispatch', async () => {
    const activeAccount = buildActiveAccount();
    const closedAccount = Account.reconstitute({
      id: activeAccount.getId(),
      email: activeAccount.getEmail(),
      role: activeAccount.getRole(),
      status: AccountStatus.Closed,
      userProfile: activeAccount.getUserProfile(),
      createdAt: activeAccount.getCreatedAt(),
      updatedAt: activeAccount.getUpdatedAt(),
    });
    const repository = new FakeAccountRepository(closedAccount);
    const useCase = new SuspendAccountUseCase(repository, dispatcher);

    await assert.rejects(
      () => useCase.execute(new SuspendAccountCommand({ accountId: closedAccount.getId().toString() })),
      AccountClosedError,
    );

    assert.equal(repository.saved.length, 0);
    assert.equal(dispatcher.dispatched.length, 0);
  });

  it('is idempotent when suspending an already-suspended account (no duplicate event)', async () => {
    const account = buildActiveAccount();
    account.suspend();
    account.releaseDomainEvents();
    const repository = new FakeAccountRepository(account);
    const useCase = new SuspendAccountUseCase(repository, dispatcher);

    await useCase.execute(new SuspendAccountCommand({ accountId: account.getId().toString() }));

    assert.equal(account.getStatus(), AccountStatus.Suspended);
    assert.equal(repository.saved.length, 1);
    assert.deepEqual(dispatcher.dispatched[0], []);
  });
});
