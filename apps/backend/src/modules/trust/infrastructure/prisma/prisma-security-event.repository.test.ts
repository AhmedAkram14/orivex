import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SecurityEvent } from '../../domain/entities/security-event.entity.js';
import { SecurityEventType } from '../../domain/enums/security-event-type.enum.js';

import { PrismaSecurityEventRepository } from './prisma-security-event.repository.js';

describe('PrismaSecurityEventRepository', () => {
  it('creates a row via a plain create, never an upsert', async () => {
    const created: unknown[] = [];
    const fakePrisma = {
      securityEvent: {
        create: async ({ data }: { data: unknown }) => {
          created.push(data);
        },
      },
    } as never;
    const repository = new PrismaSecurityEventRepository(fakePrisma);
    const event = SecurityEvent.record({
      accountId: '11111111-1111-4111-8111-111111111111',
      eventType: SecurityEventType.LoginFailed,
      ipAddress: '203.0.113.10',
    });

    await repository.record(event);

    assert.equal(created.length, 1);
    assert.deepEqual(created[0], {
      id: event.getId(),
      accountId: event.getAccountId(),
      eventType: 'LOGIN_FAILED',
      status: 'DETECTED',
      ipAddress: '203.0.113.10',
      userAgent: null,
      metadata: {},
      detectedAt: event.getDetectedAt(),
    });
  });
});
