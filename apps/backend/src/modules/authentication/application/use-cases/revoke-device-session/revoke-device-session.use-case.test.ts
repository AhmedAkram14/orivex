import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Credential } from '../../../domain/entities/credential.entity.js';
import { Session } from '../../../domain/entities/session.entity.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import { PasswordHash } from '../../../domain/value-objects/password-hash.value-object.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import { RevokeDeviceSessionCommand } from './revoke-device-session.command.js';
import { RevokeDeviceSessionUseCase } from './revoke-device-session.use-case.js';

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
    return [...this.byId.values()].filter((session) => session.getCredentialId() === credentialId);
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

describe('RevokeDeviceSessionUseCase', () => {
  it('returns not_found when no credential exists for the account', async () => {
    const useCase = new RevokeDeviceSessionUseCase(new FakeCredentialRepository([]), new FakeSessionRepository([]), new FakeTokenGenerator());

    const result = await useCase.execute(new RevokeDeviceSessionCommand({ accountId: 'nobody', sessionId: 'x' }));

    assert.equal(result, 'not_found');
  });

  it('returns not_found when the session belongs to a different credential', async () => {
    const credential = Credential.register({ accountId: 'account-1', passwordHash: PasswordHash.create('hashed:pw') });
    const otherCredential = Credential.register({ accountId: 'account-2', passwordHash: PasswordHash.create('hashed:pw') });
    const otherSession = Session.create({
      credentialId: otherCredential.getId(),
      refreshTokenHash: TokenHash.create('hash:other-token'),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const useCase = new RevokeDeviceSessionUseCase(
      new FakeCredentialRepository([credential, otherCredential]),
      new FakeSessionRepository([otherSession]),
      new FakeTokenGenerator(),
    );

    const result = await useCase.execute(
      new RevokeDeviceSessionCommand({ accountId: 'account-1', sessionId: otherSession.getId() }),
    );

    assert.equal(result, 'not_found');
  });

  it('returns cannot_revoke_current when the session matches the caller current refresh token', async () => {
    const credential = Credential.register({ accountId: 'account-1', passwordHash: PasswordHash.create('hashed:pw') });
    const session = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:current-token'),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const useCase = new RevokeDeviceSessionUseCase(
      new FakeCredentialRepository([credential]),
      new FakeSessionRepository([session]),
      new FakeTokenGenerator(),
    );

    const result = await useCase.execute(
      new RevokeDeviceSessionCommand({ accountId: 'account-1', sessionId: session.getId(), currentRefreshToken: 'current-token' }),
    );

    assert.equal(result, 'cannot_revoke_current');
    assert.equal(session.getRevokedAt(), undefined);
  });

  it('revokes another session belonging to the caller', async () => {
    const credential = Credential.register({ accountId: 'account-1', passwordHash: PasswordHash.create('hashed:pw') });
    const session = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:other-token'),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const useCase = new RevokeDeviceSessionUseCase(
      new FakeCredentialRepository([credential]),
      new FakeSessionRepository([session]),
      new FakeTokenGenerator(),
    );

    const result = await useCase.execute(
      new RevokeDeviceSessionCommand({ accountId: 'account-1', sessionId: session.getId(), currentRefreshToken: 'current-token' }),
    );

    assert.equal(result, 'revoked');
    assert.ok(session.getRevokedAt());
  });
});
