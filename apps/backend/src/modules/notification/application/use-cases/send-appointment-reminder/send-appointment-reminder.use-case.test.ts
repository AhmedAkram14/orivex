import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { Account } from '../../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../../identity/domain/repositories/account.repository.js';
import { EmailAddress } from '../../../../identity/domain/value-objects/email-address.value-object.js';
import { DisplayName } from '../../../../identity/domain/value-objects/display-name.value-object.js';
import type { AccountId } from '../../../../identity/domain/value-objects/account-id.value-object.js';
import { Notification } from '../../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../../domain/repositories/notification.repository.js';
import type { EmailSenderPort } from '../../../../authentication/application/ports/email-sender.port.js';

import { SendAppointmentReminderCommand } from './send-appointment-reminder.command.js';
import { SendAppointmentReminderUseCase } from './send-appointment-reminder.use-case.js';

class FakeAccountRepository implements AccountRepository {
  constructor(private readonly account: Account | null) {}
  async findById(id: AccountId): Promise<Account | null> {
    return this.account && this.account.getId().toString() === id.toString() ? this.account : null;
  }
  async findByEmail(): Promise<Account | null> {
    return null;
  }

  findAll(): Promise<{ accounts: Account[]; total: number }> {
    return Promise.resolve({ accounts: [], total: 0 });
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

class FakeEmailSender implements EmailSenderPort {
  public lastCall: { to: string; template: string; data: Record<string, unknown> } | undefined;
  async send(to: string, template: string, data: Record<string, unknown>): Promise<void> {
    this.lastCall = { to, template, data };
  }
}

function buildAccount(): Account {
  return Account.register({
    email: EmailAddress.create('patient@example.com'),
    role: AccountRole.Patient,
    displayName: DisplayName.create('Amina Youssef'),
  });
}

describe('SendAppointmentReminderUseCase', () => {
  it('creates and persists a Notification, and sends the reminder email', async () => {
    const account = buildAccount();
    const accountRepo = new FakeAccountRepository(account);
    const notificationRepo = new FakeNotificationRepository();
    const emailSender = new FakeEmailSender();

    const useCase = new SendAppointmentReminderUseCase(
      new GetAccountByIdUseCase(accountRepo),
      notificationRepo,
      emailSender,
    );

    await useCase.execute(
      new SendAppointmentReminderCommand({
        accountId: account.getId().toString(),
        scheduledAt: '2026-08-01T10:00:00.000Z',
      }),
    );

    assert.equal(notificationRepo.saved.length, 1);
    assert.equal(notificationRepo.saved[0]?.getAccountId(), account.getId().toString());
    assert.match(notificationRepo.saved[0]?.getDescription() ?? '', /2026-08-01T10:00:00\.000Z/);

    assert.equal(emailSender.lastCall?.to, 'patient@example.com');
    assert.equal(emailSender.lastCall?.template, 'appointment-reminder');
    assert.equal(emailSender.lastCall?.data.scheduledAt, '2026-08-01T10:00:00.000Z');
  });

  it('is a silent no-op for an unknown/deleted account (never throws)', async () => {
    const accountRepo = new FakeAccountRepository(null);
    const notificationRepo = new FakeNotificationRepository();
    const emailSender = new FakeEmailSender();

    const useCase = new SendAppointmentReminderUseCase(
      new GetAccountByIdUseCase(accountRepo),
      notificationRepo,
      emailSender,
    );

    await useCase.execute(
      new SendAppointmentReminderCommand({
        accountId: '99999999-9999-4999-8999-999999999999',
        scheduledAt: '2026-08-01T10:00:00.000Z',
      }),
    );

    assert.equal(notificationRepo.saved.length, 0);
    assert.equal(emailSender.lastCall, undefined);
  });
});
