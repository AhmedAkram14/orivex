import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MAX_FAILED_LOGIN_ATTEMPTS } from '../constants/authentication.constants.js';
import { CredentialStatus } from '../enums/credential-status.enum.js';
import { PasswordHash } from '../value-objects/password-hash.value-object.js';

import { Credential } from './credential.entity.js';

function buildCredential(): Credential {
  return Credential.register({
    accountId: '11111111-1111-4111-8111-111111111111',
    passwordHash: PasswordHash.create('hashed-value'),
  });
}

describe('Credential', () => {
  it('registers as ACTIVE and raises CredentialCreated', () => {
    const credential = buildCredential();

    assert.equal(credential.getStatus(), CredentialStatus.Active);
    assert.equal(credential.getFailedLoginAttempts(), 0);
    const events = credential.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].eventName, 'authentication.credential.created');
  });

  it('locks the credential exactly at the configured threshold, not before', () => {
    const credential = buildCredential();
    credential.releaseDomainEvents();

    for (let i = 1; i < MAX_FAILED_LOGIN_ATTEMPTS; i += 1) {
      credential.recordFailedLogin();
      assert.equal(credential.getStatus(), CredentialStatus.Active, `should stay active after attempt ${i}`);
    }

    credential.recordFailedLogin();
    assert.equal(credential.getStatus(), CredentialStatus.Locked);
    assert.ok(credential.getLockedUntil());
    assert.ok(credential.isLocked(new Date()));

    const events = credential.releaseDomainEvents();
    const eventNames = events.map((event) => event.eventName);
    assert.equal(eventNames.filter((name) => name === 'authentication.login.failed').length, MAX_FAILED_LOGIN_ATTEMPTS);
    assert.equal(eventNames.filter((name) => name === 'authentication.account.locked').length, 1);
  });

  it('clears the lockout and resets the counter on a successful login', () => {
    const credential = buildCredential();
    for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS; i += 1) {
      credential.recordFailedLogin();
    }
    credential.releaseDomainEvents();
    assert.equal(credential.getStatus(), CredentialStatus.Locked);

    credential.recordSuccessfulLogin();

    assert.equal(credential.getStatus(), CredentialStatus.Active);
    assert.equal(credential.getFailedLoginAttempts(), 0);
    assert.equal(credential.getLockedUntil(), undefined);
    assert.equal(credential.isLocked(new Date()), false);
  });

  it('treats the lock as expired once lockedUntil has passed, even though status still reads LOCKED', () => {
    const credential = buildCredential();
    for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS; i += 1) {
      credential.recordFailedLogin();
    }

    const future = new Date((credential.getLockedUntil() as Date).getTime() + 1);
    assert.equal(credential.isLocked(future), false);
  });

  it('changePassword replaces the hash and raises PasswordChanged', () => {
    const credential = buildCredential();
    credential.releaseDomainEvents();
    const newHash = PasswordHash.create('new-hashed-value');

    credential.changePassword(newHash);

    assert.equal(credential.getPasswordHash().toString(), 'new-hashed-value');
    const events = credential.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].eventName, 'authentication.password.changed');
  });

  it('verifyEmail is idempotent — the second call does not move the timestamp', () => {
    const credential = buildCredential();
    credential.verifyEmail();
    const firstVerifiedAt = credential.getEmailVerifiedAt();

    credential.verifyEmail();

    assert.equal(credential.getEmailVerifiedAt(), firstVerifiedAt);
    assert.ok(credential.isEmailVerified());
  });
});
