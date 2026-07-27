import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Account } from '../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository, ListAccountsOptions, ListAccountsResult } from '../../../identity/domain/repositories/account.repository.js';
import { DisplayName } from '../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../identity/domain/value-objects/email-address.value-object.js';
import { ListAccountsUseCase } from '../../../identity/application/use-cases/list-accounts/list-accounts.use-case.js';
import type { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

import { NotifyAdminsOfVerificationSubmittedHandler } from './notify-admins-of-verification-submitted.handler.js';

class FakeAccountRepository implements AccountRepository {
  constructor(private readonly accounts: Account[]) {}
  async findById(): Promise<Account | null> {
    return null;
  }
  async findByEmail(): Promise<Account | null> {
    return null;
  }
  async findAll(options: ListAccountsOptions): Promise<ListAccountsResult> {
    const matches = options.role ? this.accounts.filter((account) => account.getRole() === options.role) : this.accounts;
    return { accounts: matches, total: matches.length };
  }
  async save(): Promise<void> {}
}

class FakeNotificationRepository implements NotificationRepository {
  public saved: Notification[] = [];
  async findById(): Promise<Notification | null> {
    return null;
  }
  async findByAccountId(): Promise<Notification[]> {
    return [];
  }
  async findByAccountIdPage(): Promise<Notification[]> {
    return [];
  }
  async countByAccountId(): Promise<number> {
    return 0;
  }
  async save(notification: Notification): Promise<void> {
    this.saved.push(notification);
  }
}

class FakeLogger {
  public errors: unknown[] = [];
  error(message: unknown, ...rest: unknown[]): void {
    this.errors.push({ message, rest });
  }
}

function buildAccount(role: AccountRole): Account {
  return Account.register({
    email: EmailAddress.create(`${role}-${Math.random()}@orivex.dev`),
    role,
    displayName: DisplayName.create('Test Account'),
  });
}

describe('NotifyAdminsOfVerificationSubmittedHandler', () => {
  it('notifies every SuperAdmin account, never a Doctor/Patient account, when a doctor submits', async () => {
    const superAdmin1 = buildAccount(AccountRole.SuperAdmin);
    const superAdmin2 = buildAccount(AccountRole.SuperAdmin);
    const doctor = buildAccount(AccountRole.Doctor);

    const accountRepo = new FakeAccountRepository([superAdmin1, superAdmin2, doctor]);
    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();

    const handler = new NotifyAdminsOfVerificationSubmittedHandler(
      new ListAccountsUseCase(accountRepo),
      notificationRepo,
      logger as never,
    );

    await handler.handle({
      verificationCaseId: '11111111-1111-4111-8111-111111111111',
      subjectAccountId: '22222222-2222-4222-8222-222222222222',
      subjectType: 'doctor',
    });

    assert.equal(notificationRepo.saved.length, 2);
    const notifiedAccountIds = notificationRepo.saved.map((notification) => notification.getAccountId()).sort();
    assert.deepEqual(notifiedAccountIds, [superAdmin1.getId().toString(), superAdmin2.getId().toString()].sort());
    assert.ok(notificationRepo.saved.every((notification) => notification.getDescription().includes('doctor')));
    assert.equal(logger.errors.length, 0);
  });

  it('is a silent no-op when there are no SuperAdmin accounts yet', async () => {
    const accountRepo = new FakeAccountRepository([buildAccount(AccountRole.Patient)]);
    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();

    const handler = new NotifyAdminsOfVerificationSubmittedHandler(
      new ListAccountsUseCase(accountRepo),
      notificationRepo,
      logger as never,
    );

    await handler.handle({
      verificationCaseId: '11111111-1111-4111-8111-111111111111',
      subjectAccountId: '33333333-3333-4333-8333-333333333333',
      subjectType: 'patient',
    });

    assert.equal(notificationRepo.saved.length, 0);
    assert.equal(logger.errors.length, 0);
  });

  it('logs (and never throws) when listing accounts fails', async () => {
    class ThrowingAccountRepository implements AccountRepository {
      async findById(): Promise<Account | null> {
        return null;
      }
      async findByEmail(): Promise<Account | null> {
        return null;
      }
      async findAll(): Promise<ListAccountsResult> {
        throw new Error('database unavailable');
      }
      async save(): Promise<void> {}
    }

    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyAdminsOfVerificationSubmittedHandler(
      new ListAccountsUseCase(new ThrowingAccountRepository()),
      notificationRepo,
      logger as never,
    );

    await handler.handle({
      verificationCaseId: '11111111-1111-4111-8111-111111111111',
      subjectAccountId: '33333333-3333-4333-8333-333333333333',
      subjectType: 'patient',
    });

    assert.equal(notificationRepo.saved.length, 0);
    assert.equal(logger.errors.length, 1);
  });
});
