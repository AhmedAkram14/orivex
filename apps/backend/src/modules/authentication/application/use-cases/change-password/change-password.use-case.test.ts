import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { SecurityEvent } from '../../../../trust/domain/entities/security-event.entity.js';
import type { SecurityEventRepository } from '../../../../trust/domain/repositories/security-event.repository.js';
import { RecordSecurityEventUseCase } from '../../../../trust/application/use-cases/record-security-event/record-security-event.use-case.js';
import { Credential } from '../../../domain/entities/credential.entity.js';
import { Session } from '../../../domain/entities/session.entity.js';
import { InvalidCredentialsError } from '../../../domain/exceptions/invalid-credentials.error.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import { PasswordHash } from '../../../domain/value-objects/password-hash.value-object.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { PasswordHasherPort } from '../../ports/password-hasher.port.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import { ChangePasswordCommand } from './change-password.command.js';
import { ChangePasswordUseCase } from './change-password.use-case.js';

const CURRENT_PASSWORD = 'CurrentStr0ng';
const STORED_HASH = `hashed:${CURRENT_PASSWORD}`;

class FakeCredentialRepository implements CredentialRepository {
  public readonly saved: Credential[] = [];
  constructor(private readonly credential: Credential | null) {}
  findByAccountId(): Promise<Credential | null> {
    return Promise.resolve(this.credential);
  }
  findById(): Promise<Credential | null> {
    return Promise.resolve(this.credential);
  }
  save(credential: Credential): Promise<void> {
    this.saved.push(credential);
    return Promise.resolve();
  }
}

class FakeSessionRepository implements SessionRepository {
  public readonly saved: Session[] = [];
  public revokeAllCalledFor: string[] = [];
  constructor(private readonly sessions: Session[]) {}
  findById(): Promise<Session | null> {
    return Promise.resolve(null);
  }
  findByRefreshTokenHash(): Promise<Session | null> {
    return Promise.resolve(null);
  }
  findAllActiveForCredential(): Promise<Session[]> {
    return Promise.resolve(this.sessions);
  }
  save(session: Session): Promise<void> {
    this.saved.push(session);
    return Promise.resolve();
  }
  revokeAllForCredential(credentialId: string): Promise<void> {
    this.revokeAllCalledFor.push(credentialId);
    return Promise.resolve();
  }
}

class FakeSecurityEventRepository implements SecurityEventRepository {
  public readonly recorded: SecurityEvent[] = [];
  record(event: SecurityEvent): Promise<void> {
    this.recorded.push(event);
    return Promise.resolve();
  }
}

class FakePasswordHasher implements PasswordHasherPort {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
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
  async dispatch(): Promise<void> {}
  subscribe(): void {}
}

function buildCredential(accountId: string): Credential {
  return Credential.register({ accountId, passwordHash: PasswordHash.create(STORED_HASH) });
}

describe('ChangePasswordUseCase', () => {
  it('changes the password and keeps only the current session alive', async () => {
    const credential = buildCredential('77777777-7777-4777-8777-777777777777');
    const currentSession = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:current-token'),
      expiresAt: new Date(Date.now() + 60_000),
    });
    const otherSession = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:other-token'),
      expiresAt: new Date(Date.now() + 60_000),
    });
    const credentialRepository = new FakeCredentialRepository(credential);
    const sessionRepository = new FakeSessionRepository([currentSession, otherSession]);
    const securityEventRepository = new FakeSecurityEventRepository();
    const useCase = new ChangePasswordUseCase(
      credentialRepository,
      sessionRepository,
      new FakePasswordHasher(),
      new FakeTokenGenerator(),
      new RecordSecurityEventUseCase(securityEventRepository),
      new RecordingDispatcher(),
    );

    await useCase.execute(
      new ChangePasswordCommand({
        accountId: credential.getAccountId(),
        currentPassword: CURRENT_PASSWORD,
        newPassword: 'BrandNewStr0ng',
        currentRefreshToken: 'current-token',
      }),
    );

    assert.equal(credentialRepository.saved[0].getPasswordHash().toString(), 'hashed:BrandNewStr0ng');
    assert.equal(sessionRepository.saved.length, 1);
    assert.equal(sessionRepository.saved[0].getId(), otherSession.getId());
    assert.ok(sessionRepository.saved[0].getRevokedAt());
    assert.equal(securityEventRepository.recorded[0].getEventType(), 'password_changed');
  });

  it('revokes every session when no current-session refresh token is provided', async () => {
    const credential = buildCredential('88888888-8888-4888-8888-888888888888');
    const sessionRepository = new FakeSessionRepository([]);
    const useCase = new ChangePasswordUseCase(
      new FakeCredentialRepository(credential),
      sessionRepository,
      new FakePasswordHasher(),
      new FakeTokenGenerator(),
      new RecordSecurityEventUseCase(new FakeSecurityEventRepository()),
      new RecordingDispatcher(),
    );

    await useCase.execute(
      new ChangePasswordCommand({
        accountId: credential.getAccountId(),
        currentPassword: CURRENT_PASSWORD,
        newPassword: 'BrandNewStr0ng',
      }),
    );

    assert.deepEqual(sessionRepository.revokeAllCalledFor, [credential.getId()]);
  });

  it('rejects an incorrect current password', async () => {
    const credential = buildCredential('99999999-9999-4999-8999-999999999999');
    const useCase = new ChangePasswordUseCase(
      new FakeCredentialRepository(credential),
      new FakeSessionRepository([]),
      new FakePasswordHasher(),
      new FakeTokenGenerator(),
      new RecordSecurityEventUseCase(new FakeSecurityEventRepository()),
      new RecordingDispatcher(),
    );

    await assert.rejects(
      () =>
        useCase.execute(
          new ChangePasswordCommand({
            accountId: credential.getAccountId(),
            currentPassword: 'WrongCurrent1',
            newPassword: 'BrandNewStr0ng',
          }),
        ),
      InvalidCredentialsError,
    );
  });
});
