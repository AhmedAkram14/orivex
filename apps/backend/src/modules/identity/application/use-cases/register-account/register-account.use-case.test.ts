import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { ConflictError } from '../../../../../shared/errors/app-error.js';
import type { Account } from '../../../domain/entities/account.entity.js';
import { AccountRole } from '../../../domain/enums/account-role.enum.js';
import { InvalidEmailAddressError } from '../../../domain/exceptions/invalid-email-address.error.js';
import type { AccountRepository } from '../../../domain/repositories/account.repository.js';
import type { EmailAddress } from '../../../domain/value-objects/email-address.value-object.js';
import type { DomainEventDispatcher } from '../../ports/domain-event-dispatcher.port.js';

import { RegisterAccountCommand } from './register-account.command.js';
import { RegisterAccountUseCase } from './register-account.use-case.js';

class FakeAccountRepository implements AccountRepository {
  public readonly saved: Account[] = [];
  private existingEmail: string | undefined;

  seedExistingEmail(email: string): void {
    this.existingEmail = email;
  }

  findById(): Promise<Account | null> {
    return Promise.resolve(null);
  }

  findByEmail(email: EmailAddress): Promise<Account | null> {
    if (this.existingEmail && email.toString() === this.existingEmail) {
      return Promise.resolve({} as Account);
    }
    return Promise.resolve(null);
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
}

describe('RegisterAccountUseCase', () => {
  let repository: FakeAccountRepository;
  let dispatcher: FakeDomainEventDispatcher;
  let useCase: RegisterAccountUseCase;

  beforeEach(() => {
    repository = new FakeAccountRepository();
    dispatcher = new FakeDomainEventDispatcher();
    useCase = new RegisterAccountUseCase(repository, dispatcher);
  });

  it('registers a new account, persists it, and dispatches AccountCreated', async () => {
    const account = await useCase.execute(
      new RegisterAccountCommand({
        email: '  Doctor@Example.COM ',
        keycloakId: 'kc-123',
        role: AccountRole.Doctor,
        displayName: 'Dr. Amina Hassan',
      }),
    );

    assert.equal(account.getEmail().toString(), 'doctor@example.com');
    assert.equal(repository.saved.length, 1);
    assert.equal(repository.saved[0], account);

    assert.equal(dispatcher.dispatched.length, 1);
    const events = dispatcher.dispatched[0] as { eventName: string }[];
    assert.equal(events.length, 1);
    assert.equal(events[0].eventName, 'identity.account.created');

    // Events must already be drained from the account by the time the use
    // case returns (releaseDomainEvents was called before dispatch).
    assert.deepEqual(account.releaseDomainEvents(), []);
  });

  it('rejects registration when an account with the same email already exists', async () => {
    repository.seedExistingEmail('taken@example.com');

    await assert.rejects(
      () =>
        useCase.execute(
          new RegisterAccountCommand({
            email: 'taken@example.com',
            keycloakId: 'kc-456',
            role: AccountRole.Patient,
            displayName: 'Someone',
          }),
        ),
      ConflictError,
    );

    assert.equal(repository.saved.length, 0);
    assert.equal(dispatcher.dispatched.length, 0);
  });

  it('propagates domain validation errors without persisting or dispatching anything', async () => {
    await assert.rejects(
      () =>
        useCase.execute(
          new RegisterAccountCommand({
            email: 'not-an-email',
            keycloakId: 'kc-789',
            role: AccountRole.Patient,
            displayName: 'Someone',
          }),
        ),
      InvalidEmailAddressError,
    );

    assert.equal(repository.saved.length, 0);
    assert.equal(dispatcher.dispatched.length, 0);
  });
});
