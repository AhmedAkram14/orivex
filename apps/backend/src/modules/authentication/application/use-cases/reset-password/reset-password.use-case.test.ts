import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { SecurityEvent } from '../../../../trust/domain/entities/security-event.entity.js';
import type { SecurityEventRepository } from '../../../../trust/domain/repositories/security-event.repository.js';
import { RecordSecurityEventUseCase } from '../../../../trust/application/use-cases/record-security-event/record-security-event.use-case.js';
import { AuthToken } from '../../../domain/entities/auth-token.entity.js';
import { Credential } from '../../../domain/entities/credential.entity.js';
import type { Session } from '../../../domain/entities/session.entity.js';
import { TokenPurpose } from '../../../domain/enums/token-purpose.enum.js';
import { TokenExpiredError } from '../../../domain/exceptions/token-expired.error.js';
import { TokenInvalidError } from '../../../domain/exceptions/token-invalid.error.js';
import type { AuthTokenRepository } from '../../../domain/repositories/auth-token.repository.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import { PasswordHash } from '../../../domain/value-objects/password-hash.value-object.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { PasswordHasherPort } from '../../ports/password-hasher.port.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import { ResetPasswordCommand } from './reset-password.command.js';
import { ResetPasswordUseCase } from './reset-password.use-case.js';

class FakeAuthTokenRepository implements AuthTokenRepository {
  public readonly saved: AuthToken[] = [];
  constructor(private readonly token: AuthToken | null) {}
  findActiveByHash(): Promise<AuthToken | null> {
    return Promise.resolve(this.token);
  }
  save(token: AuthToken): Promise<void> {
    this.saved.push(token);
    return Promise.resolve();
  }
}

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
  public revokeAllCalledFor: string[] = [];
  findById(): Promise<Session | null> {
    return Promise.resolve(null);
  }
  findByRefreshTokenHash(): Promise<Session | null> {
    return Promise.resolve(null);
  }
  findAllActiveForCredential(): Promise<Session[]> {
    return Promise.resolve([]);
  }
  save(): Promise<void> {
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
  async verify(): Promise<boolean> {
    return true;
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

function buildCredential(): Credential {
  return Credential.register({
    accountId: '55555555-5555-4555-8555-555555555555',
    passwordHash: PasswordHash.create('old-hash'),
  });
}

function buildToken(credentialId: string, expiresAt = new Date(Date.now() + 60_000)): AuthToken {
  return AuthToken.issue({
    credentialId,
    tokenHash: TokenHash.create('hash:reset-token'),
    purpose: TokenPurpose.PasswordReset,
    expiresAt,
  });
}

describe('ResetPasswordUseCase', () => {
  it('changes the password, marks the token used, and revokes every session', async () => {
    const credential = buildCredential();
    const token = buildToken(credential.getId());
    const authTokenRepository = new FakeAuthTokenRepository(token);
    const credentialRepository = new FakeCredentialRepository(credential);
    const sessionRepository = new FakeSessionRepository();
    const securityEventRepository = new FakeSecurityEventRepository();
    const useCase = new ResetPasswordUseCase(
      authTokenRepository,
      credentialRepository,
      sessionRepository,
      new FakePasswordHasher(),
      new FakeTokenGenerator(),
      new RecordSecurityEventUseCase(securityEventRepository),
      new RecordingDispatcher(),
    );

    await useCase.execute(new ResetPasswordCommand({ token: 'reset-token', password: 'NewStr0ngPassword' }));

    assert.equal(credentialRepository.saved[0].getPasswordHash().toString(), 'hashed:NewStr0ngPassword');
    assert.equal(authTokenRepository.saved[0].getStatus(), 'used');
    assert.deepEqual(sessionRepository.revokeAllCalledFor, [credential.getId()]);
    assert.equal(securityEventRepository.recorded[0].getEventType(), 'password_reset_completed');
  });

  it('rejects an already-used token, preventing a second reset from the same link', async () => {
    const credential = buildCredential();
    const token = buildToken(credential.getId());
    token.markUsed();
    const useCase = new ResetPasswordUseCase(
      new FakeAuthTokenRepository(null),
      new FakeCredentialRepository(credential),
      new FakeSessionRepository(),
      new FakePasswordHasher(),
      new FakeTokenGenerator(),
      new RecordSecurityEventUseCase(new FakeSecurityEventRepository()),
      new RecordingDispatcher(),
    );

    await assert.rejects(
      () => useCase.execute(new ResetPasswordCommand({ token: 'reset-token', password: 'NewStr0ngPassword' })),
      TokenInvalidError,
    );
  });

  it('rejects an expired token', async () => {
    const credential = buildCredential();
    const token = buildToken(credential.getId(), new Date(Date.now() - 1));
    const useCase = new ResetPasswordUseCase(
      new FakeAuthTokenRepository(token),
      new FakeCredentialRepository(credential),
      new FakeSessionRepository(),
      new FakePasswordHasher(),
      new FakeTokenGenerator(),
      new RecordSecurityEventUseCase(new FakeSecurityEventRepository()),
      new RecordingDispatcher(),
    );

    await assert.rejects(
      () => useCase.execute(new ResetPasswordCommand({ token: 'reset-token', password: 'NewStr0ngPassword' })),
      TokenExpiredError,
    );
  });
});
