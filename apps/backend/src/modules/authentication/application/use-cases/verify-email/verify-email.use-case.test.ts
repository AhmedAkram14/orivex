import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SecurityEvent } from '../../../../trust/domain/entities/security-event.entity.js';
import type { SecurityEventRepository } from '../../../../trust/domain/repositories/security-event.repository.js';
import { RecordSecurityEventUseCase } from '../../../../trust/application/use-cases/record-security-event/record-security-event.use-case.js';
import { AuthToken } from '../../../domain/entities/auth-token.entity.js';
import { Credential } from '../../../domain/entities/credential.entity.js';
import { TokenPurpose } from '../../../domain/enums/token-purpose.enum.js';
import { TokenInvalidError } from '../../../domain/exceptions/token-invalid.error.js';
import type { AuthTokenRepository } from '../../../domain/repositories/auth-token.repository.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import { PasswordHash } from '../../../domain/value-objects/password-hash.value-object.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import { VerifyEmailCommand } from './verify-email.command.js';
import { VerifyEmailUseCase } from './verify-email.use-case.js';

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

class FakeSecurityEventRepository implements SecurityEventRepository {
  public readonly recorded: SecurityEvent[] = [];
  record(event: SecurityEvent): Promise<void> {
    this.recorded.push(event);
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

describe('VerifyEmailUseCase', () => {
  it('marks the credential email-verified and the token used', async () => {
    const credential = Credential.register({
      accountId: '66666666-6666-4666-8666-666666666666',
      passwordHash: PasswordHash.create('hashed'),
    });
    const token = AuthToken.issue({
      credentialId: credential.getId(),
      tokenHash: TokenHash.create('hash:verify-token'),
      purpose: TokenPurpose.EmailVerification,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const authTokenRepository = new FakeAuthTokenRepository(token);
    const credentialRepository = new FakeCredentialRepository(credential);
    const securityEventRepository = new FakeSecurityEventRepository();
    const useCase = new VerifyEmailUseCase(
      authTokenRepository,
      credentialRepository,
      new FakeTokenGenerator(),
      new RecordSecurityEventUseCase(securityEventRepository),
    );

    await useCase.execute(new VerifyEmailCommand({ token: 'verify-token' }));

    assert.ok(credentialRepository.saved[0].isEmailVerified());
    assert.equal(authTokenRepository.saved[0].getStatus(), 'used');
    assert.equal(securityEventRepository.recorded[0].getEventType(), 'email_verified');
  });

  it('rejects an unknown token', async () => {
    const useCase = new VerifyEmailUseCase(
      new FakeAuthTokenRepository(null),
      new FakeCredentialRepository(null),
      new FakeTokenGenerator(),
      new RecordSecurityEventUseCase(new FakeSecurityEventRepository()),
    );

    await assert.rejects(
      () => useCase.execute(new VerifyEmailCommand({ token: 'unknown-token' })),
      TokenInvalidError,
    );
  });
});
