import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { Account } from '../../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../../identity/domain/repositories/account.repository.js';
import { DisplayName } from '../../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../../identity/domain/value-objects/email-address.value-object.js';
import { GetAccountByEmailUseCase } from '../../../../identity/application/use-cases/get-account-by-email/get-account-by-email.use-case.js';
import type { SecurityEvent } from '../../../../trust/domain/entities/security-event.entity.js';
import type { SecurityEventRepository } from '../../../../trust/domain/repositories/security-event.repository.js';
import { RecordSecurityEventUseCase } from '../../../../trust/application/use-cases/record-security-event/record-security-event.use-case.js';
import { Credential } from '../../../domain/entities/credential.entity.js';
import { MAX_FAILED_LOGIN_ATTEMPTS } from '../../../domain/constants/authentication.constants.js';
import { AccountLockedError } from '../../../domain/exceptions/account-locked.error.js';
import { EmailNotVerifiedError } from '../../../domain/exceptions/email-not-verified.error.js';
import { InvalidCredentialsError } from '../../../domain/exceptions/invalid-credentials.error.js';
import { PasswordHash } from '../../../domain/value-objects/password-hash.value-object.js';
import type { Session } from '../../../domain/entities/session.entity.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { JwtSignerPort } from '../../ports/jwt-signer.port.js';
import type { PasswordHasherPort } from '../../ports/password-hasher.port.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import { LoginCommand } from './login.command.js';
import { LoginUseCase } from './login.use-case.js';

const CORRECT_PASSWORD = 'Str0ngPassword';
const STORED_HASH = `hashed:${CORRECT_PASSWORD}`;

class FakeAccountRepository implements AccountRepository {
  constructor(private readonly account: Account) {}
  findById(): Promise<Account | null> {
    return Promise.resolve(this.account);
  }
  findByEmail(): Promise<Account | null> {
    return Promise.resolve(this.account);
  }

  findAll(): Promise<{ accounts: Account[]; total: number }> {
    return Promise.resolve({ accounts: [], total: 0 });
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeCredentialRepository implements CredentialRepository {
  public readonly saved: Credential[] = [];
  constructor(private credential: Credential | null) {}
  findByAccountId(): Promise<Credential | null> {
    return Promise.resolve(this.credential);
  }
  findById(): Promise<Credential | null> {
    return Promise.resolve(this.credential);
  }
  save(credential: Credential): Promise<void> {
    this.credential = credential;
    this.saved.push(credential);
    return Promise.resolve();
  }
}

class FakeSessionRepository implements SessionRepository {
  public readonly saved: Session[] = [];
  findById(): Promise<Session | null> {
    return Promise.resolve(null);
  }
  findByRefreshTokenHash(): Promise<Session | null> {
    return Promise.resolve(null);
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

class FakeSecurityEventRepository implements SecurityEventRepository {
  public readonly recorded: SecurityEvent[] = [];
  record(event: SecurityEvent): Promise<void> {
    this.recorded.push(event);
    return Promise.resolve();
  }
  findByAccountId(accountId: string): Promise<SecurityEvent[]> {
    return Promise.resolve(this.recorded.filter((event) => event.getAccountId() === accountId));
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
    return 'plain-refresh-token-0000000000000000';
  }
  hash(plain: string): string {
    return `hash:${plain}`;
  }
}

class FakeJwtSigner implements JwtSignerPort {
  async sign(): Promise<{ token: string; expiresAt: Date }> {
    return { token: 'signed.jwt.token', expiresAt: new Date(Date.now() + 900_000) };
  }
  async verify(): Promise<{ accountId: string; role: string }> {
    throw new Error('not used in this test');
  }
}

class RecordingDispatcher implements DomainEventDispatcher {
  public readonly dispatched: unknown[] = [];
  async dispatch(events: unknown[]): Promise<void> {
    this.dispatched.push(...events);
  }
  subscribe(): void {}
}

function buildAccount(): Account {
  return Account.register({
    email: EmailAddress.create('ada@example.com'),
    role: AccountRole.Patient,
    displayName: DisplayName.create('Ada Lovelace'),
  });
}

function buildVerifiedCredential(accountId: string): Credential {
  const credential = Credential.register({ accountId, passwordHash: PasswordHash.create(STORED_HASH) });
  credential.verifyEmail();
  credential.releaseDomainEvents();
  return credential;
}

describe('LoginUseCase', () => {
  let account: Account;
  let credentialRepository: FakeCredentialRepository;
  let sessionRepository: FakeSessionRepository;
  let securityEventRepository: FakeSecurityEventRepository;
  let dispatcher: RecordingDispatcher;
  let useCase: LoginUseCase;

  beforeEach(() => {
    account = buildAccount();
    credentialRepository = new FakeCredentialRepository(buildVerifiedCredential(account.getId().toString()));
    sessionRepository = new FakeSessionRepository();
    securityEventRepository = new FakeSecurityEventRepository();
    dispatcher = new RecordingDispatcher();
    useCase = new LoginUseCase(
      new GetAccountByEmailUseCase(new FakeAccountRepository(account)),
      credentialRepository,
      sessionRepository,
      new FakePasswordHasher(),
      new FakeTokenGenerator(),
      new FakeJwtSigner(),
      new RecordSecurityEventUseCase(securityEventRepository),
      dispatcher,
    );
  });

  it('succeeds with correct credentials, issuing an access token and a session', async () => {
    const result = await useCase.execute(new LoginCommand({ email: 'ada@example.com', password: CORRECT_PASSWORD }));

    assert.equal(result.account, account);
    assert.equal(result.accessToken, 'signed.jwt.token');
    assert.equal(sessionRepository.saved.length, 1);
    assert.equal(securityEventRepository.recorded[0].getEventType(), 'login_succeeded');
  });

  it('increments the failure counter and records LoginFailed on a wrong password', async () => {
    await assert.rejects(
      () => useCase.execute(new LoginCommand({ email: 'ada@example.com', password: 'WrongPassword1' })),
      InvalidCredentialsError,
    );

    assert.equal(credentialRepository.saved[0].getFailedLoginAttempts(), 1);
    assert.equal(securityEventRepository.recorded[0].getEventType(), 'login_failed');
  });

  it('locks the account after the configured number of failed attempts and records AccountLocked', async () => {
    for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS; i += 1) {
      await assert.rejects(() =>
        useCase.execute(new LoginCommand({ email: 'ada@example.com', password: 'WrongPassword1' })),
      );
    }

    const lastRecorded = securityEventRepository.recorded[securityEventRepository.recorded.length - 1];
    assert.equal(lastRecorded.getEventType(), 'account_locked');
  });

  it('rejects a locked account even with the correct password, without incrementing the counter further', async () => {
    for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS; i += 1) {
      await assert.rejects(() =>
        useCase.execute(new LoginCommand({ email: 'ada@example.com', password: 'WrongPassword1' })),
      );
    }
    const attemptsAtLockout = credentialRepository.saved[credentialRepository.saved.length - 1].getFailedLoginAttempts();

    await assert.rejects(
      () => useCase.execute(new LoginCommand({ email: 'ada@example.com', password: CORRECT_PASSWORD })),
      AccountLockedError,
    );

    assert.equal(
      credentialRepository.saved[credentialRepository.saved.length - 1].getFailedLoginAttempts(),
      attemptsAtLockout,
    );
  });

  it('rejects login for an unverified email, after the password has already been confirmed correct', async () => {
    credentialRepository = new FakeCredentialRepository(
      Credential.register({ accountId: account.getId().toString(), passwordHash: PasswordHash.create(STORED_HASH) }),
    );
    useCase = new LoginUseCase(
      new GetAccountByEmailUseCase(new FakeAccountRepository(account)),
      credentialRepository,
      sessionRepository,
      new FakePasswordHasher(),
      new FakeTokenGenerator(),
      new FakeJwtSigner(),
      new RecordSecurityEventUseCase(securityEventRepository),
      dispatcher,
    );

    await assert.rejects(
      () => useCase.execute(new LoginCommand({ email: 'ada@example.com', password: CORRECT_PASSWORD })),
      EmailNotVerifiedError,
    );
  });

  it('allows login for an unverified email when skipEmailVerification is true (SKIP_EMAIL_VERIFICATION bypass)', async () => {
    credentialRepository = new FakeCredentialRepository(
      Credential.register({ accountId: account.getId().toString(), passwordHash: PasswordHash.create(STORED_HASH) }),
    );
    useCase = new LoginUseCase(
      new GetAccountByEmailUseCase(new FakeAccountRepository(account)),
      credentialRepository,
      sessionRepository,
      new FakePasswordHasher(),
      new FakeTokenGenerator(),
      new FakeJwtSigner(),
      new RecordSecurityEventUseCase(securityEventRepository),
      dispatcher,
      true,
    );

    const result = await useCase.execute(new LoginCommand({ email: 'ada@example.com', password: CORRECT_PASSWORD }));

    assert.ok(result.accessToken);
  });
});
