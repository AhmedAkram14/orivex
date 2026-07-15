import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TokenPurpose } from '../enums/token-purpose.enum.js';
import { TokenStatus } from '../enums/token-status.enum.js';
import { TokenInvalidError } from '../exceptions/token-invalid.error.js';
import { TokenHash } from '../value-objects/token-hash.value-object.js';

import { AuthToken } from './auth-token.entity.js';

function buildToken(expiresAt = new Date(Date.now() + 60_000)): AuthToken {
  return AuthToken.issue({
    credentialId: '33333333-3333-4333-8333-333333333333',
    tokenHash: TokenHash.create('token-hash-1'),
    purpose: TokenPurpose.PasswordReset,
    expiresAt,
  });
}

describe('AuthToken', () => {
  it('issues as ACTIVE and valid', () => {
    const token = buildToken();
    assert.equal(token.getStatus(), TokenStatus.Active);
    assert.ok(token.isValid(new Date()));
  });

  it('is invalid once expiresAt has passed', () => {
    const token = buildToken(new Date(Date.now() - 1));
    assert.equal(token.isValid(new Date()), false);
  });

  it('markUsed transitions to USED and sets usedAt', () => {
    const token = buildToken();
    token.markUsed();

    assert.equal(token.getStatus(), TokenStatus.Used);
    assert.ok(token.getUsedAt());
    assert.equal(token.isValid(new Date()), false);
  });

  it('markUsed throws TokenInvalidError when the token is not ACTIVE (single-use enforcement)', () => {
    const token = buildToken();
    token.markUsed();

    assert.throws(() => token.markUsed(), TokenInvalidError);
  });
});
