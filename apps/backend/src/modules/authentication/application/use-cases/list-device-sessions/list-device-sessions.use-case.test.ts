import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Credential } from '../../../domain/entities/credential.entity.js';
import { Session } from '../../../domain/entities/session.entity.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import { PasswordHash } from '../../../domain/value-objects/password-hash.value-object.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import { ListDeviceSessionsUseCase } from './list-device-sessions.use-case.js';

class FakeCredentialRepository implements CredentialRepository {
  constructor(private readonly credentials: Credential[]) {}
  async findByAccountId(accountId: string): Promise<Credential | null> {
    return this.credentials.find((credential) => credential.getAccountId() === accountId) ?? null;
  }
  async findById(id: string): Promise<Credential | null> {
    return this.credentials.find((credential) => credential.getId() === id) ?? null;
  }
  async save(): Promise<void> {}
}

class FakeSessionRepository implements SessionRepository {
  constructor(private readonly sessions: Session[]) {}
  async findById(id: string): Promise<Session | null> {
    return this.sessions.find((session) => session.getId() === id) ?? null;
  }
  async findByRefreshTokenHash(hash: TokenHash): Promise<Session | null> {
    return this.sessions.find((session) => session.matchesRefreshTokenHash(hash)) ?? null;
  }
  async findAllActiveForCredential(credentialId: string): Promise<Session[]> {
    return this.sessions.filter((session) => session.getCredentialId() === credentialId && session.isActive(new Date()));
  }
  async save(): Promise<void> {}
  async revokeAllForCredential(): Promise<void> {}
}

class FakeTokenGenerator implements TokenGeneratorPort {
  generate(): string {
    return 'unused';
  }
  hash(plain: string): string {
    return `hash:${plain}`;
  }
}

describe('ListDeviceSessionsUseCase', () => {
  it('returns null when no credential exists for the account', async () => {
    const useCase = new ListDeviceSessionsUseCase(new FakeCredentialRepository([]), new FakeSessionRepository([]), new FakeTokenGenerator());

    const result = await useCase.execute({ accountId: 'nobody' });

    assert.equal(result, null);
  });

  it('lists the credential active sessions and flags the one matching the current refresh token', async () => {
    const credential = Credential.register({ accountId: 'account-1', passwordHash: PasswordHash.create('hashed:pw') });
    const currentSession = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:current-token'),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const otherSession = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:other-token'),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const useCase = new ListDeviceSessionsUseCase(
      new FakeCredentialRepository([credential]),
      new FakeSessionRepository([currentSession, otherSession]),
      new FakeTokenGenerator(),
    );

    const result = await useCase.execute({ accountId: 'account-1', currentRefreshToken: 'current-token' });

    assert.ok(result);
    assert.equal(result?.length, 2);
    const current = result?.find((item) => item.session.getId() === currentSession.getId());
    const other = result?.find((item) => item.session.getId() === otherSession.getId());
    assert.equal(current?.isCurrent, true);
    assert.equal(other?.isCurrent, false);
  });

  it('flags no session as current when no refresh token is presented', async () => {
    const credential = Credential.register({ accountId: 'account-1', passwordHash: PasswordHash.create('hashed:pw') });
    const session = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:some-token'),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const useCase = new ListDeviceSessionsUseCase(
      new FakeCredentialRepository([credential]),
      new FakeSessionRepository([session]),
      new FakeTokenGenerator(),
    );

    const result = await useCase.execute({ accountId: 'account-1' });

    assert.equal(result?.[0]?.isCurrent, false);
  });
});
