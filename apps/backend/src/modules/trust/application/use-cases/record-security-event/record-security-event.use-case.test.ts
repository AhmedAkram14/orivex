import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SecurityEvent } from '../../../domain/entities/security-event.entity.js';
import { SecurityEventStatus } from '../../../domain/enums/security-event-status.enum.js';
import { SecurityEventType } from '../../../domain/enums/security-event-type.enum.js';
import { TrustDomainError } from '../../../domain/exceptions/trust-domain.error.js';
import type { SecurityEventRepository } from '../../../domain/repositories/security-event.repository.js';

import { RecordSecurityEventCommand } from './record-security-event.command.js';
import { RecordSecurityEventUseCase } from './record-security-event.use-case.js';

class FakeSecurityEventRepository implements SecurityEventRepository {
  public readonly recorded: SecurityEvent[] = [];

  async record(event: SecurityEvent): Promise<void> {
    this.recorded.push(event);
  }
}

describe('RecordSecurityEventUseCase', () => {
  it('records a security event with DETECTED status and persists it', async () => {
    const repository = new FakeSecurityEventRepository();
    const useCase = new RecordSecurityEventUseCase(repository);

    const event = await useCase.execute(
      new RecordSecurityEventCommand({
        accountId: '11111111-1111-4111-8111-111111111111',
        eventType: SecurityEventType.LoginFailed,
        ipAddress: '203.0.113.10',
        userAgent: 'test-agent',
        metadata: { attempt: 3 },
      }),
    );

    assert.equal(event.getStatus(), SecurityEventStatus.Detected);
    assert.equal(event.getEventType(), SecurityEventType.LoginFailed);
    assert.equal(event.getIpAddress(), '203.0.113.10');
    assert.deepEqual(event.getMetadata(), { attempt: 3 });
    assert.equal(repository.recorded.length, 1);
    assert.equal(repository.recorded[0], event);
  });

  it('propagates a domain validation error without persisting anything', async () => {
    const repository = new FakeSecurityEventRepository();
    const useCase = new RecordSecurityEventUseCase(repository);

    await assert.rejects(
      () =>
        useCase.execute(
          new RecordSecurityEventCommand({
            accountId: '',
            eventType: SecurityEventType.LoginFailed,
          }),
        ),
      TrustDomainError,
    );

    assert.equal(repository.recorded.length, 0);
  });
});
