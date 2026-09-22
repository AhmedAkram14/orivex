import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SecurityEvent } from '../../../../trust/domain/entities/security-event.entity.js';
import { SecurityEventType } from '../../../../trust/domain/enums/security-event-type.enum.js';
import { ListSecurityEventsForAccountUseCase } from '../../../../trust/application/use-cases/list-security-events-for-account/list-security-events-for-account.use-case.js';
import type { SecurityEventRepository } from '../../../../trust/domain/repositories/security-event.repository.js';

import { ListLoginHistoryForAccountUseCase } from './list-login-history-for-account.use-case.js';

class FakeSecurityEventRepository implements SecurityEventRepository {
  constructor(private readonly events: SecurityEvent[]) {}
  async record(): Promise<void> {}
  async findByAccountId(accountId: string): Promise<SecurityEvent[]> {
    return this.events.filter((event) => event.getAccountId() === accountId);
  }
}

describe('ListLoginHistoryForAccountUseCase', () => {
  it('filters out non-login-relevant security events', async () => {
    const accountId = '11111111-1111-4111-8111-111111111111';
    const loginSucceeded = SecurityEvent.record({ accountId, eventType: SecurityEventType.LoginSucceeded });
    const loginFailed = SecurityEvent.record({ accountId, eventType: SecurityEventType.LoginFailed });
    const accountLocked = SecurityEvent.record({ accountId, eventType: SecurityEventType.AccountLocked });
    const passwordChanged = SecurityEvent.record({ accountId, eventType: SecurityEventType.PasswordChanged });
    const sessionRevoked = SecurityEvent.record({ accountId, eventType: SecurityEventType.SessionRevoked });
    const repository = new FakeSecurityEventRepository([
      loginSucceeded,
      loginFailed,
      accountLocked,
      passwordChanged,
      sessionRevoked,
    ]);
    const useCase = new ListLoginHistoryForAccountUseCase(new ListSecurityEventsForAccountUseCase(repository));

    const result = await useCase.execute({ accountId });

    assert.equal(result.total, 3);
    const ids = result.items.map((event) => event.getId());
    assert.ok(ids.includes(loginSucceeded.getId()));
    assert.ok(ids.includes(loginFailed.getId()));
    assert.ok(ids.includes(accountLocked.getId()));
    assert.ok(!ids.includes(passwordChanged.getId()));
    assert.ok(!ids.includes(sessionRevoked.getId()));
  });

  it('returns an empty page when the account has no login events', async () => {
    const repository = new FakeSecurityEventRepository([]);
    const useCase = new ListLoginHistoryForAccountUseCase(new ListSecurityEventsForAccountUseCase(repository));

    const result = await useCase.execute({ accountId: 'nobody' });

    assert.deepEqual(result, { items: [], total: 0, page: 1, pageCount: 1 });
  });

  it('paginates using page/limit', async () => {
    const accountId = '11111111-1111-4111-8111-111111111111';
    const events = Array.from({ length: 5 }, () =>
      SecurityEvent.record({ accountId, eventType: SecurityEventType.LoginSucceeded }),
    );
    const repository = new FakeSecurityEventRepository(events);
    const useCase = new ListLoginHistoryForAccountUseCase(new ListSecurityEventsForAccountUseCase(repository));

    const firstPage = await useCase.execute({ accountId, page: 1, limit: 2 });
    assert.equal(firstPage.items.length, 2);
    assert.equal(firstPage.total, 5);
    assert.equal(firstPage.pageCount, 3);

    const lastPage = await useCase.execute({ accountId, page: 3, limit: 2 });
    assert.equal(lastPage.items.length, 1);
  });

  it('filters by outcome=success', async () => {
    const accountId = '11111111-1111-4111-8111-111111111111';
    const loginSucceeded = SecurityEvent.record({ accountId, eventType: SecurityEventType.LoginSucceeded });
    const loginFailed = SecurityEvent.record({ accountId, eventType: SecurityEventType.LoginFailed });
    const repository = new FakeSecurityEventRepository([loginSucceeded, loginFailed]);
    const useCase = new ListLoginHistoryForAccountUseCase(new ListSecurityEventsForAccountUseCase(repository));

    const result = await useCase.execute({ accountId, outcome: 'success' });

    assert.equal(result.total, 1);
    assert.equal(result.items[0]?.getId(), loginSucceeded.getId());
  });

  it('filters by outcome=failed, including locked events', async () => {
    const accountId = '11111111-1111-4111-8111-111111111111';
    const loginSucceeded = SecurityEvent.record({ accountId, eventType: SecurityEventType.LoginSucceeded });
    const loginFailed = SecurityEvent.record({ accountId, eventType: SecurityEventType.LoginFailed });
    const accountLocked = SecurityEvent.record({ accountId, eventType: SecurityEventType.AccountLocked });
    const repository = new FakeSecurityEventRepository([loginSucceeded, loginFailed, accountLocked]);
    const useCase = new ListLoginHistoryForAccountUseCase(new ListSecurityEventsForAccountUseCase(repository));

    const result = await useCase.execute({ accountId, outcome: 'failed' });

    assert.equal(result.total, 2);
    const ids = result.items.map((event) => event.getId());
    assert.ok(ids.includes(loginFailed.getId()));
    assert.ok(ids.includes(accountLocked.getId()));
  });

  it('filters by a from/to date range', async () => {
    const accountId = '11111111-1111-4111-8111-111111111111';
    const inRange = SecurityEvent.record({ accountId, eventType: SecurityEventType.LoginSucceeded });
    const repository = new FakeSecurityEventRepository([inRange]);
    const useCase = new ListLoginHistoryForAccountUseCase(new ListSecurityEventsForAccountUseCase(repository));

    const includesIt = await useCase.execute({
      accountId,
      from: new Date(Date.now() - 60_000),
      to: new Date(Date.now() + 60_000),
    });
    assert.equal(includesIt.total, 1);

    const excludesIt = await useCase.execute({
      accountId,
      from: new Date(Date.now() + 60_000),
    });
    assert.equal(excludesIt.total, 0);
  });
});
