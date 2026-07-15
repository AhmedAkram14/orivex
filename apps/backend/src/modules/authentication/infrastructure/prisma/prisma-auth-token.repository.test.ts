import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TokenPurpose } from '../../domain/enums/token-purpose.enum.js';
import { TokenHash } from '../../domain/value-objects/token-hash.value-object.js';

import { PrismaAuthTokenRepository } from './prisma-auth-token.repository.js';

const BASE_ROW = {
  id: '33333333-3333-4333-8333-333333333333',
  credentialId: '44444444-4444-4444-8444-444444444444',
  tokenHash: 'hash-value',
  expiresAt: new Date(Date.now() + 60_000),
  usedAt: null,
  createdAt: new Date(),
};

describe('PrismaAuthTokenRepository', () => {
  it('returns the token when the hash matches and purpose/status agree', async () => {
    const fakePrisma = {
      authToken: {
        findUnique: async () => ({ ...BASE_ROW, purpose: 'PASSWORD_RESET', status: 'ACTIVE' }),
      },
    } as never;
    const repository = new PrismaAuthTokenRepository(fakePrisma);

    const token = await repository.findActiveByHash(TokenHash.create('hash-value'), TokenPurpose.PasswordReset);

    assert.ok(token);
    assert.equal(token?.getId(), BASE_ROW.id);
  });

  it('returns null when the row purpose does not match the requested purpose', async () => {
    const fakePrisma = {
      authToken: {
        findUnique: async () => ({ ...BASE_ROW, purpose: 'EMAIL_VERIFICATION', status: 'ACTIVE' }),
      },
    } as never;
    const repository = new PrismaAuthTokenRepository(fakePrisma);

    const token = await repository.findActiveByHash(TokenHash.create('hash-value'), TokenPurpose.PasswordReset);

    assert.equal(token, null);
  });

  it('returns null when the row status is not ACTIVE', async () => {
    const fakePrisma = {
      authToken: {
        findUnique: async () => ({ ...BASE_ROW, purpose: 'PASSWORD_RESET', status: 'USED' }),
      },
    } as never;
    const repository = new PrismaAuthTokenRepository(fakePrisma);

    const token = await repository.findActiveByHash(TokenHash.create('hash-value'), TokenPurpose.PasswordReset);

    assert.equal(token, null);
  });

  it('returns null when no row matches the hash', async () => {
    const fakePrisma = {
      authToken: {
        findUnique: async () => null,
      },
    } as never;
    const repository = new PrismaAuthTokenRepository(fakePrisma);

    const token = await repository.findActiveByHash(TokenHash.create('missing-hash'), TokenPurpose.PasswordReset);

    assert.equal(token, null);
  });
});
