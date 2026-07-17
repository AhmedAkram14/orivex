import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Credential } from '../../../domain/entities/credential.entity.js';
import { Session } from '../../../domain/entities/session.entity.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import { PasswordHash } from '../../../domain/value-objects/password-hash.value-object.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';

import { LogoutAllSessionsCommand } from './logout-all-sessions.command.js';
import { LogoutAllSessionsUseCase } from './logout-all-sessions.use-case.js';

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
    for (const session of sessions) this.byId.set(session.getId(), session);
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
    return [...this.byId.values()].filter((session) => session.getCredentialId() === credentialId);
  }
  async save(session: Session): Promise<void> {
    this.byId.set(session.getId(), session);
  }
  async revokeAllForCredential(credentialId: string): Promise<void> {
    for (const session of this.byId.values()) {
      if (session.getCredentialId() === credentialId) session.revoke();
    }
  }
}

describe('LogoutAllSessionsUseCase', () => {
  it('returns not_found when no credential exists for the account', async () => {
    const useCase = new LogoutAllSessionsUseCase(new FakeCredentialRepository([]), new FakeSessionRepository([]));

    const result = await useCase.execute(new LogoutAllSessionsCommand({ accountId: 'nobody' }));

    assert.equal(result, 'not_found');
  });

  it('revokes every active session for the credential', async () => {
    const credential = Credential.register({ accountId: 'account-1', passwordHash: PasswordHash.create('hashed:pw') });
    const sessionA = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:a'),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const sessionB = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:b'),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const useCase = new LogoutAllSessionsUseCase(
      new FakeCredentialRepository([credential]),
      new FakeSessionRepository([sessionA, sessionB]),
    );

    const result = await useCase.execute(new LogoutAllSessionsCommand({ accountId: 'account-1' }));

    assert.equal(result, 'ok');
    assert.ok(sessionA.getRevokedAt());
    assert.ok(sessionB.getRevokedAt());
  });
});
