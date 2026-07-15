import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { Session } from '../../../domain/entities/session.entity.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import { LogoutCommand } from './logout.command.js';
import { LogoutUseCase } from './logout.use-case.js';

class FakeSessionRepository implements SessionRepository {
  public readonly saved: Session[] = [];
  constructor(private readonly session: Session | null) {}
  findById(): Promise<Session | null> {
    return Promise.resolve(this.session);
  }
  findByRefreshTokenHash(): Promise<Session | null> {
    return Promise.resolve(this.session);
  }
  findAllActiveForCredential(): Promise<Session[]> {
    return Promise.resolve([]);
  }
  save(session: Session): Promise<void> {
    this.saved.push(session);
    return Promise.resolve();
  }
  revokeAllForCredential(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeTokenGenerator implements TokenGeneratorPort {
  generate(): string {
    return 'unused';
  }
  hash(plain: string): string {
    return `hash:${plain}`;
  }
}

class RecordingDispatcher implements DomainEventDispatcher {
  public readonly dispatched: unknown[] = [];
  async dispatch(events: unknown[]): Promise<void> {
    this.dispatched.push(...events);
  }
  subscribe(): void {}
}

function buildSession(): Session {
  return Session.create({
    credentialId: '44444444-4444-4444-8444-444444444444',
    refreshTokenHash: TokenHash.create('hash:refresh-token'),
    expiresAt: new Date(Date.now() + 60_000),
  });
}

describe('LogoutUseCase', () => {
  it('revokes the session matching the presented refresh token', async () => {
    const session = buildSession();
    const repository = new FakeSessionRepository(session);
    const useCase = new LogoutUseCase(repository, new FakeTokenGenerator(), new RecordingDispatcher());

    await useCase.execute(new LogoutCommand({ refreshToken: 'refresh-token' }));

    assert.equal(repository.saved.length, 1);
    assert.ok(repository.saved[0].getRevokedAt());
  });

  it('is idempotent when no refresh token cookie is present', async () => {
    const repository = new FakeSessionRepository(null);
    const useCase = new LogoutUseCase(repository, new FakeTokenGenerator(), new RecordingDispatcher());

    await useCase.execute(new LogoutCommand({}));

    assert.equal(repository.saved.length, 0);
  });

  it('is idempotent when the refresh token matches no session', async () => {
    const repository = new FakeSessionRepository(null);
    const useCase = new LogoutUseCase(repository, new FakeTokenGenerator(), new RecordingDispatcher());

    await useCase.execute(new LogoutCommand({ refreshToken: 'unknown-token' }));

    assert.equal(repository.saved.length, 0);
  });
});
