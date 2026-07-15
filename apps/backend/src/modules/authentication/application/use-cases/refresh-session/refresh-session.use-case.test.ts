import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { Account } from '../../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../../identity/domain/repositories/account.repository.js';
import { DisplayName } from '../../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../../identity/domain/value-objects/email-address.value-object.js';
import { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { SecurityEvent } from '../../../../trust/domain/entities/security-event.entity.js';
import type { SecurityEventRepository } from '../../../../trust/domain/repositories/security-event.repository.js';
import { RecordSecurityEventUseCase } from '../../../../trust/application/use-cases/record-security-event/record-security-event.use-case.js';
import { Credential } from '../../../domain/entities/credential.entity.js';
import { Session } from '../../../domain/entities/session.entity.js';
import { TokenExpiredError } from '../../../domain/exceptions/token-expired.error.js';
import { TokenInvalidError } from '../../../domain/exceptions/token-invalid.error.js';
import { PasswordHash } from '../../../domain/value-objects/password-hash.value-object.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import type { JwtSignerPort } from '../../ports/jwt-signer.port.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import { RefreshSessionCommand } from './refresh-session.command.js';
import { RefreshSessionUseCase } from './refresh-session.use-case.js';

class FakeAccountRepository implements AccountRepository {
  constructor(private readonly account: Account) {}
  findById(): Promise<Account | null> {
    return Promise.resolve(this.account);
  }
  findByEmail(): Promise<Account | null> {
    return Promise.resolve(this.account);
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeCredentialRepository implements CredentialRepository {
  constructor(private readonly credential: Credential) {}
  findByAccountId(): Promise<Credential | null> {
    return Promise.resolve(this.credential);
  }
  findById(): Promise<Credential | null> {
    return Promise.resolve(this.credential);
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeSessionRepository implements SessionRepository {
  public readonly saved: Session[] = [];
  public revokeAllCalledFor: string[] = [];
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

class FakeTokenGenerator implements TokenGeneratorPort {
  generate(): string {
    return 'new-plain-refresh-token-000000000000';
  }
  hash(plain: string): string {
    return `hash:${plain}`;
  }
}

class FakeJwtSigner implements JwtSignerPort {
  async sign(): Promise<{ token: string; expiresAt: Date }> {
    return { token: 'new.jwt.token', expiresAt: new Date(Date.now() + 900_000) };
  }
  async verify(): Promise<{ accountId: string; role: string }> {
    throw new Error('not used in this test');
  }
}

class RecordingDispatcher implements DomainEventDispatcher {
  async dispatch(): Promise<void> {}
  subscribe(): void {}
}

function buildAccount(): Account {
  return Account.register({
    email: EmailAddress.create('ada@example.com'),
    role: AccountRole.Patient,
    displayName: DisplayName.create('Ada Lovelace'),
  });
}

function buildCredential(accountId: string): Credential {
  return Credential.register({ accountId, passwordHash: PasswordHash.create('hashed') });
}

describe('RefreshSessionUseCase', () => {
  it('rotates the refresh token and issues a fresh access token for an active session', async () => {
    const account = buildAccount();
    const credential = buildCredential(account.getId().toString());
    const session = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:old-token'),
      expiresAt: new Date(Date.now() + 60_000),
    });
    const sessionRepository = new FakeSessionRepository(session);
    const securityEventRepository = new FakeSecurityEventRepository();
    const useCase = new RefreshSessionUseCase(
      sessionRepository,
      new FakeCredentialRepository(credential),
      new FakeTokenGenerator(),
      new FakeJwtSigner(),
      new GetAccountByIdUseCase(new FakeAccountRepository(account)),
      new RecordSecurityEventUseCase(securityEventRepository),
      new RecordingDispatcher(),
    );

    const result = await useCase.execute(new RefreshSessionCommand({ refreshToken: 'old-token' }));

    assert.equal(result.accessToken, 'new.jwt.token');
    assert.equal(result.refreshToken, 'new-plain-refresh-token-000000000000');
    assert.equal(sessionRepository.saved.length, 1);
    assert.ok(sessionRepository.saved[0].matchesRefreshTokenHash(TokenHash.create('hash:new-plain-refresh-token-000000000000')));
  });

  it('rejects and revokes every session for the credential when a revoked token is reused', async () => {
    const account = buildAccount();
    const credential = buildCredential(account.getId().toString());
    const session = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:stolen-token'),
      expiresAt: new Date(Date.now() + 60_000),
    });
    session.revoke();
    const sessionRepository = new FakeSessionRepository(session);
    const securityEventRepository = new FakeSecurityEventRepository();
    const useCase = new RefreshSessionUseCase(
      sessionRepository,
      new FakeCredentialRepository(credential),
      new FakeTokenGenerator(),
      new FakeJwtSigner(),
      new GetAccountByIdUseCase(new FakeAccountRepository(account)),
      new RecordSecurityEventUseCase(securityEventRepository),
      new RecordingDispatcher(),
    );

    await assert.rejects(
      () => useCase.execute(new RefreshSessionCommand({ refreshToken: 'stolen-token' })),
      TokenInvalidError,
    );

    assert.deepEqual(sessionRepository.revokeAllCalledFor, [credential.getId()]);
    assert.equal(securityEventRepository.recorded[0].getEventType(), 'refresh_token_reuse_detected');
  });

  it('rejects an expired-but-not-revoked session with TokenExpiredError', async () => {
    const account = buildAccount();
    const credential = buildCredential(account.getId().toString());
    const session = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash: TokenHash.create('hash:expired-token'),
      expiresAt: new Date(Date.now() - 1),
    });
    const sessionRepository = new FakeSessionRepository(session);
    const useCase = new RefreshSessionUseCase(
      sessionRepository,
      new FakeCredentialRepository(credential),
      new FakeTokenGenerator(),
      new FakeJwtSigner(),
      new GetAccountByIdUseCase(new FakeAccountRepository(account)),
      new RecordSecurityEventUseCase(new FakeSecurityEventRepository()),
      new RecordingDispatcher(),
    );

    await assert.rejects(
      () => useCase.execute(new RefreshSessionCommand({ refreshToken: 'expired-token' })),
      TokenExpiredError,
    );
  });

  it('rejects an unknown refresh token with TokenInvalidError', async () => {
    const account = buildAccount();
    const credential = buildCredential(account.getId().toString());
    const sessionRepository = new FakeSessionRepository(null);
    const useCase = new RefreshSessionUseCase(
      sessionRepository,
      new FakeCredentialRepository(credential),
      new FakeTokenGenerator(),
      new FakeJwtSigner(),
      new GetAccountByIdUseCase(new FakeAccountRepository(account)),
      new RecordSecurityEventUseCase(new FakeSecurityEventRepository()),
      new RecordingDispatcher(),
    );

    await assert.rejects(
      () => useCase.execute(new RefreshSessionCommand({ refreshToken: 'unknown-token' })),
      TokenInvalidError,
    );
  });
});
