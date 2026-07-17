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

    assert.equal(result.length, 3);
    const ids = result.map((event) => event.getId());
    assert.ok(ids.includes(loginSucceeded.getId()));
    assert.ok(ids.includes(loginFailed.getId()));
    assert.ok(ids.includes(accountLocked.getId()));
    assert.ok(!ids.includes(passwordChanged.getId()));
    assert.ok(!ids.includes(sessionRevoked.getId()));
  });

  it('returns an empty array when the account has no login events', async () => {
    const repository = new FakeSecurityEventRepository([]);
    const useCase = new ListLoginHistoryForAccountUseCase(new ListSecurityEventsForAccountUseCase(repository));

    const result = await useCase.execute({ accountId: 'nobody' });

    assert.deepEqual(result, []);
  });
});
