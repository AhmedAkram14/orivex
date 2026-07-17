import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SecurityEvent } from '../../../domain/entities/security-event.entity.js';
import { SecurityEventType } from '../../../domain/enums/security-event-type.enum.js';
import type { SecurityEventRepository } from '../../../domain/repositories/security-event.repository.js';

import { ListSecurityEventsForAccountUseCase } from './list-security-events-for-account.use-case.js';

class FakeSecurityEventRepository implements SecurityEventRepository {
  constructor(private readonly events: SecurityEvent[]) {}
  async record(): Promise<void> {}
  async findByAccountId(accountId: string): Promise<SecurityEvent[]> {
    return this.events.filter((event) => event.getAccountId() === accountId);
  }
}

describe('ListSecurityEventsForAccountUseCase', () => {
  it('returns only the events belonging to the given account', async () => {
    const accountId = '11111111-1111-4111-8111-111111111111';
    const otherAccountId = '22222222-2222-4222-8222-222222222222';
    const mine = SecurityEvent.record({ accountId, eventType: SecurityEventType.LoginSucceeded });
    const theirs = SecurityEvent.record({ accountId: otherAccountId, eventType: SecurityEventType.LoginSucceeded });
    const useCase = new ListSecurityEventsForAccountUseCase(new FakeSecurityEventRepository([mine, theirs]));

    const result = await useCase.execute({ accountId });

    assert.equal(result.length, 1);
    assert.equal(result[0]?.getId(), mine.getId());
  });

  it('returns an empty array (not a thrown error) when the account has no events', async () => {
    const useCase = new ListSecurityEventsForAccountUseCase(new FakeSecurityEventRepository([]));

    const result = await useCase.execute({ accountId: '99999999-9999-4999-8999-999999999999' });

    assert.deepEqual(result, []);
  });
});
