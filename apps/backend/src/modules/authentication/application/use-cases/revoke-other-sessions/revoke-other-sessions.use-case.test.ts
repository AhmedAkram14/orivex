import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Credential } from '../../../domain/entities/credential.entity.js';
import { Session } from '../../../domain/entities/session.entity.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import { PasswordHash } from '../../../domain/value-objects/password-hash.value-object.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import { RevokeOtherSessionsCommand } from './revoke-other-sessions.command.js';
import { RevokeOtherSessionsUseCase } from './revoke-other-sessions.use-case.js';

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
  private readonly byId = new Map<string, Session>();
  constructor(sessions: Session[]) {
    for (const session of sessions) {
      this.byId.set(session.getId(), session);
    }
  }
  async findById(id: string): Promise<Session | null> {
    return this.byId.get(id) ?? null;
  }
  async findByRefreshTokenHash(hash: TokenHash): Promise<Session | null> {
    for (const session of this.byId.values()) {
      if (session.matchesRefreshTokenHash(hash)) return session;
    }
    return null;
  }
  async findAllActiveForCredential(credentialId: string): Promise<Session[]> {
    return [...this.byId.values()].filter((session) => session.getCredentialId() === credentialId && session.isActive(new Date()));
  }
  async save(session: Session): Promise<void> {
    this.byId.set(session.getId(), session);
  }
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

describe('RevokeOtherSessionsUseCase', () => {
  it('returns not_found when no credential exists for the account', async () => {
    const useCase = new RevokeOtherSessionsUseCase(new FakeCredentialRepository([]), new FakeSessionRepository([]), new FakeTokenGenerator());

    const result = await useCase.execute(new RevokeOtherSessionsCommand({ accountId: 'nobody' }));

    assert.equal(result, 'not_found');
  });

  it('revokes every other active session but spares the current one', async () => {
    const credential = Credential.register({ accountId: 'account-1', passwordHash: PasswordHash.create('hashed:pw') });
    const currentSession = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:current-token'),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const otherSessionA = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:other-token-a'),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const otherSessionB = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:other-token-b'),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const useCase = new RevokeOtherSessionsUseCase(
      new FakeCredentialRepository([credential]),
      new FakeSessionRepository([currentSession, otherSessionA, otherSessionB]),
      new FakeTokenGenerator(),
    );

    const result = await useCase.execute(
      new RevokeOtherSessionsCommand({ accountId: 'account-1', currentRefreshToken: 'current-token' }),
    );

    assert.equal(result, 'ok');
    assert.equal(currentSession.getRevokedAt(), undefined);
    assert.ok(otherSessionA.getRevokedAt());
    assert.ok(otherSessionB.getRevokedAt());
  });

  it('revokes every active session when no current refresh token is provided', async () => {
    const credential = Credential.register({ accountId: 'account-1', passwordHash: PasswordHash.create('hashed:pw') });
    const sessionA = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:a'),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const useCase = new RevokeOtherSessionsUseCase(
      new FakeCredentialRepository([credential]),
      new FakeSessionRepository([sessionA]),
      new FakeTokenGenerator(),
    );

    const result = await useCase.execute(new RevokeOtherSessionsCommand({ accountId: 'account-1' }));

    assert.equal(result, 'ok');
    assert.ok(sessionA.getRevokedAt());
  });

  it("doesn't revoke sessions belonging to a different credential", async () => {
    const credential = Credential.register({ accountId: 'account-1', passwordHash: PasswordHash.create('hashed:pw') });
    const otherCredential = Credential.register({ accountId: 'account-2', passwordHash: PasswordHash.create('hashed:pw') });
    const otherSession = Session.create({
      credentialId: otherCredential.getId(),
      refreshTokenHash: TokenHash.create('hash:other'),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const useCase = new RevokeOtherSessionsUseCase(
      new FakeCredentialRepository([credential, otherCredential]),
      new FakeSessionRepository([otherSession]),
      new FakeTokenGenerator(),
    );

    await useCase.execute(new RevokeOtherSessionsCommand({ accountId: 'account-1' }));

    assert.equal(otherSession.getRevokedAt(), undefined);
  });
});
