import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TokenHash } from '../value-objects/token-hash.value-object.js';

import { Session } from './session.entity.js';

function buildSession(expiresAt = new Date(Date.now() + 60_000)): Session {
  return Session.create({
    credentialId: '22222222-2222-4222-8222-222222222222',
    refreshTokenHash: TokenHash.create('hash-1'),
    expiresAt,
  });
}

describe('Session', () => {
  it('creates as active and raises SessionCreated', () => {
    const session = buildSession();

    assert.ok(session.isActive(new Date()));
    const events = session.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].eventName, 'authentication.session.created');
  });

  it('is inactive once expiresAt has passed', () => {
    const session = buildSession(new Date(Date.now() - 1));
    assert.equal(session.isActive(new Date()), false);
  });

  it('matchesRefreshTokenHash compares by value, not identity', () => {
    const session = buildSession();
    assert.ok(session.matchesRefreshTokenHash(TokenHash.create('hash-1')));
    assert.equal(session.matchesRefreshTokenHash(TokenHash.create('hash-2')), false);
  });

  it('rotate replaces the refresh token hash and extends expiry in place', () => {
    const session = buildSession();
    const newExpiry = new Date(Date.now() + 120_000);

    session.rotate(TokenHash.create('hash-2'), newExpiry);

    assert.ok(session.matchesRefreshTokenHash(TokenHash.create('hash-2')));
    assert.equal(session.getExpiresAt().getTime(), newExpiry.getTime());
  });

  it('revoke is idempotent — the second call raises no duplicate event', () => {
    const session = buildSession();
    session.releaseDomainEvents();

    session.revoke();
    assert.equal(session.releaseDomainEvents().length, 1);

    session.revoke();
    assert.equal(session.releaseDomainEvents().length, 0);
    assert.equal(session.isActive(new Date()), false);
  });
});
