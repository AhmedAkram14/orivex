import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PrismaSessionRepository } from './prisma-session.repository.js';

describe('PrismaSessionRepository', () => {
  it('revokeAllForCredential issues a single bulk update scoped to un-revoked sessions for that credential', async () => {
    const calls: unknown[] = [];
    const fakePrisma = {
      session: {
        updateMany: async (args: unknown) => {
          calls.push(args);
          return { count: 2 };
        },
      },
    } as never;
    const repository = new PrismaSessionRepository(fakePrisma);

    await repository.revokeAllForCredential('55555555-5555-4555-8555-555555555555');

    assert.equal(calls.length, 1);
    assert.deepEqual((calls[0] as { where: unknown }).where, {
      credentialId: '55555555-5555-4555-8555-555555555555',
      revokedAt: null,
    });
  });

  it('findAllActiveForCredential filters to un-revoked, unexpired sessions', async () => {
    const calls: unknown[] = [];
    const fakePrisma = {
      session: {
        findMany: async (args: unknown) => {
          calls.push(args);
          return [];
        },
      },
    } as never;
    const repository = new PrismaSessionRepository(fakePrisma);

    await repository.findAllActiveForCredential('66666666-6666-4666-8666-666666666666');

    const where = (calls[0] as { where: { credentialId: string; revokedAt: null; expiresAt: { gt: Date } } }).where;
    assert.equal(where.credentialId, '66666666-6666-4666-8666-666666666666');
    assert.equal(where.revokedAt, null);
    assert.ok(where.expiresAt.gt instanceof Date);
  });
});
