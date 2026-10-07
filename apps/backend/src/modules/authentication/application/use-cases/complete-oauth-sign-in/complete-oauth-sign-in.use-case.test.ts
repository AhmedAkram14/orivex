import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { Account } from '../../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../../identity/domain/repositories/account.repository.js';
import type { AccountId } from '../../../../identity/domain/value-objects/account-id.value-object.js';
import { DisplayName } from '../../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../../identity/domain/value-objects/email-address.value-object.js';
import { GetAccountByEmailUseCase } from '../../../../identity/application/use-cases/get-account-by-email/get-account-by-email.use-case.js';
import { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { RegisterAccountUseCase } from '../../../../identity/application/use-cases/register-account/register-account.use-case.js';
import type { SecurityEvent } from '../../../../trust/domain/entities/security-event.entity.js';
import type { SecurityEventRepository } from '../../../../trust/domain/repositories/security-event.repository.js';
import { RecordSecurityEventUseCase } from '../../../../trust/application/use-cases/record-security-event/record-security-event.use-case.js';
import type { AuthToken } from '../../../domain/entities/auth-token.entity.js';
import { Credential } from '../../../domain/entities/credential.entity.js';
import type { ExternalIdentity } from '../../../domain/entities/external-identity.entity.js';
import type { Session } from '../../../domain/entities/session.entity.js';
import { OAuthProvider } from '../../../domain/enums/oauth-provider.enum.js';
import { OAuthSignInFailedError, OAuthSignInFailureReason } from '../../../domain/exceptions/oauth-sign-in-failed.error.js';
import type { AuthTokenRepository } from '../../../domain/repositories/auth-token.repository.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { ExternalIdentityRepository } from '../../../domain/repositories/external-identity.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import { PasswordHash } from '../../../domain/value-objects/password-hash.value-object.js';
import type { EmailSenderPort } from '../../ports/email-sender.port.js';
import type { JwtSignerPort } from '../../ports/jwt-signer.port.js';
import type { OAuthProfile, OAuthProviderClientPort, OAuthProviderRegistryPort } from '../../ports/oauth-provider.port.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import { CompleteOAuthSignInCommand } from './complete-oauth-sign-in.command.js';
import { CompleteOAuthSignInUseCase } from './complete-oauth-sign-in.use-case.js';

class InMemoryAccountRepository implements AccountRepository {
  public readonly accounts: Account[] = [];
  findById(id: AccountId): Promise<Account | null> {
    return Promise.resolve(this.accounts.find((account) => account.getId().toString() === id.toString()) ?? null);
  }
  findByEmail(email: EmailAddress): Promise<Account | null> {
    return Promise.resolve(this.accounts.find((account) => account.getEmail().toString() === email.toString()) ?? null);
  }
  findAll(): Promise<{ accounts: Account[]; total: number }> {
    return Promise.resolve({ accounts: this.accounts, total: this.accounts.length });
  }
  save(account: Account): Promise<void> {
    if (!this.accounts.includes(account)) this.accounts.push(account);
    return Promise.resolve();
  }
}

class InMemoryCredentialRepository implements CredentialRepository {
  public readonly credentials: Credential[] = [];
  findByAccountId(accountId: string): Promise<Credential | null> {
    return Promise.resolve(this.credentials.find((credential) => credential.getAccountId() === accountId) ?? null);
  }
  findById(id: string): Promise<Credential | null> {
    return Promise.resolve(this.credentials.find((credential) => credential.getId() === id) ?? null);
  }
  save(credential: Credential): Promise<void> {
    if (!this.credentials.includes(credential)) this.credentials.push(credential);
    return Promise.resolve();
  }
}

class InMemoryExternalIdentityRepository implements ExternalIdentityRepository {
  public readonly identities: ExternalIdentity[] = [];
  findByProviderSubject(provider: OAuthProvider, providerSubject: string): Promise<ExternalIdentity | null> {
    return Promise.resolve(
      this.identities.find((identity) => identity.getProvider() === provider && identity.getProviderSubject() === providerSubject) ??
        null,
    );
  }
  save(identity: ExternalIdentity): Promise<void> {
    if (!this.identities.includes(identity)) this.identities.push(identity);
    return Promise.resolve();
  }
}

class FakeSessionRepository implements SessionRepository {
  public readonly saved: Session[] = [];
  public readonly revokedAllFor: string[] = [];
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
  revokeAllForCredential(credentialId: string): Promise<void> {
    this.revokedAllFor.push(credentialId);
    return Promise.resolve();
  }
}

class FakeAuthTokenRepository implements AuthTokenRepository {
  public readonly saved: AuthToken[] = [];
  findActiveByHash(): Promise<AuthToken | null> {
    return Promise.resolve(null);
  }
  save(token: AuthToken): Promise<void> {
    this.saved.push(token);
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

class RecordingEmailSender implements EmailSenderPort {
  public readonly sent: { to: string; template: string }[] = [];
  send(to: string, template: string): Promise<void> {
    this.sent.push({ to, template });
    return Promise.resolve();
  }
}

class FakeTokenGenerator implements TokenGeneratorPort {
  generate(): string {
    return 'plain-token-00000000000000000000000000000';
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

class NoopDispatcher implements DomainEventDispatcher {
  async dispatch(): Promise<void> {}
  subscribe(): void {}
}

// Returns whatever profile the test sets -- stands in for the real
// provider's code exchange.
class StubProviderRegistry implements OAuthProviderRegistryPort {
  public profile!: OAuthProfile;
  get(provider: OAuthProvider): OAuthProviderClientPort {
    return {
      provider,
      buildAuthorizationUrl: () => 'https://provider.example/authorize',
      exchangeCode: () => Promise.resolve({ ...this.profile, provider }),
    };
  }
  listConfigured(): OAuthProvider[] {
    return [OAuthProvider.Google, OAuthProvider.Facebook];
  }
}

function command(provider: OAuthProvider): CompleteOAuthSignInCommand {
  return new CompleteOAuthSignInCommand({ provider, code: 'auth-code', codeVerifier: 'verifier' });
}

describe('CompleteOAuthSignInUseCase', () => {
  let accounts: InMemoryAccountRepository;
  let credentials: InMemoryCredentialRepository;
  let identities: InMemoryExternalIdentityRepository;
  let sessions: FakeSessionRepository;
  let authTokens: FakeAuthTokenRepository;
  let securityEvents: FakeSecurityEventRepository;
  let emailSender: RecordingEmailSender;
  let registry: StubProviderRegistry;
  let useCase: CompleteOAuthSignInUseCase;

  beforeEach(() => {
    accounts = new InMemoryAccountRepository();
    credentials = new InMemoryCredentialRepository();
    identities = new InMemoryExternalIdentityRepository();
    sessions = new FakeSessionRepository();
    authTokens = new FakeAuthTokenRepository();
    securityEvents = new FakeSecurityEventRepository();
    emailSender = new RecordingEmailSender();
    registry = new StubProviderRegistry();
    const dispatcher = new NoopDispatcher();
    useCase = new CompleteOAuthSignInUseCase(
      registry,
      identities,
      credentials,
      sessions,
      authTokens,
      new GetAccountByIdUseCase(accounts),
      new GetAccountByEmailUseCase(accounts),
      new RegisterAccountUseCase(accounts, dispatcher),
      new FakeTokenGenerator(),
      new FakeJwtSigner(),
      emailSender,
      new RecordSecurityEventUseCase(securityEvents),
      dispatcher,
    );
  });

  function seedPasswordAccount(email: string, verified: boolean): { account: Account; credential: Credential } {
    const account = Account.register({
      email: EmailAddress.create(email),
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Existing Person'),
    });
    accounts.accounts.push(account);
    const credential = Credential.register({
      accountId: account.getId().toString(),
      passwordHash: PasswordHash.create('hashed:Str0ngPassword'),
    });
    if (verified) credential.verifyEmail();
    credentials.credentials.push(credential);
    return { account, credential };
  }

  it('creates a passwordless, verified Patient account for a new Google user and signs them in', async () => {
    registry.profile = {
      provider: OAuthProvider.Google,
      subject: 'google-sub-1',
      email: 'new.person@example.com',
      emailVerified: true,
      displayName: 'New Person',
    };

    const result = await useCase.execute(command(OAuthProvider.Google));

    assert.equal(result.status, 'signed_in');
    assert.equal(accounts.accounts.length, 1);
    assert.equal(accounts.accounts[0].getRole(), AccountRole.Patient);
    assert.equal(credentials.credentials[0].hasPassword(), false);
    assert.equal(credentials.credentials[0].isEmailVerified(), true);
    assert.equal(identities.identities.length, 1);
    assert.equal(sessions.saved.length, 1);
    const succeeded = securityEvents.recorded.find((event) => event.getEventType() === 'login_succeeded');
    assert.deepEqual(succeeded?.getMetadata(), { method: 'google' });
  });

  it('signs a returning provider user into the same account without creating another', async () => {
    registry.profile = { provider: OAuthProvider.Google, subject: 'google-sub-1', email: 'a@example.com', emailVerified: true };
    await useCase.execute(command(OAuthProvider.Google));

    // Even with a changed email on the provider side, the subject id wins.
    registry.profile = { provider: OAuthProvider.Google, subject: 'google-sub-1', email: 'renamed@example.com', emailVerified: true };
    const result = await useCase.execute(command(OAuthProvider.Google));

    assert.equal(result.status, 'signed_in');
    assert.equal(accounts.accounts.length, 1);
    assert.equal(identities.identities.length, 1);
  });

  it('links a Google-verified email to an existing account, keeping its role and its verified password', async () => {
    const { account, credential } = seedPasswordAccount('doc@example.com', true);
    registry.profile = { provider: OAuthProvider.Google, subject: 'google-sub-2', email: 'doc@example.com', emailVerified: true };

    const result = await useCase.execute(command(OAuthProvider.Google));

    assert.equal(result.status, 'signed_in');
    assert.equal(result.status === 'signed_in' && result.account, account);
    assert.equal(account.getRole(), AccountRole.Doctor);
    assert.equal(credential.hasPassword(), true);
    assert.equal(identities.identities[0].getCredentialId(), credential.getId());
    assert.deepEqual(sessions.revokedAllFor, []);
  });

  it('discards an unverified pre-existing password (and its sessions) when the real owner links via Google', async () => {
    const { credential } = seedPasswordAccount('victim@example.com', false);
    registry.profile = { provider: OAuthProvider.Google, subject: 'google-sub-3', email: 'victim@example.com', emailVerified: true };

    const result = await useCase.execute(command(OAuthProvider.Google));

    assert.equal(result.status, 'signed_in');
    assert.equal(credential.hasPassword(), false);
    assert.equal(credential.isEmailVerified(), true);
    assert.deepEqual(sessions.revokedAllFor, [credential.getId()]);
  });

  it('refuses to link Facebook (no verified-email assertion) to an existing account', async () => {
    seedPasswordAccount('doc@example.com', true);
    registry.profile = { provider: OAuthProvider.Facebook, subject: 'fb-1', email: 'doc@example.com', emailVerified: false };

    await assert.rejects(
      () => useCase.execute(command(OAuthProvider.Facebook)),
      (error: unknown) => error instanceof OAuthSignInFailedError && error.reason === OAuthSignInFailureReason.AccountExists,
    );
    assert.equal(identities.identities.length, 0);
  });

  it('creates a new Facebook user unverified and emails a verification link instead of signing in', async () => {
    registry.profile = { provider: OAuthProvider.Facebook, subject: 'fb-2', email: 'fb.person@example.com', emailVerified: false };

    const result = await useCase.execute(command(OAuthProvider.Facebook));

    assert.deepEqual(result, { status: 'verification_required', email: 'fb.person@example.com' });
    assert.equal(sessions.saved.length, 0);
    assert.equal(authTokens.saved.length, 1);
    assert.deepEqual(emailSender.sent, [{ to: 'fb.person@example.com', template: 'email-verification' }]);
  });

  it('fails with email_missing when the provider returns no email', async () => {
    registry.profile = { provider: OAuthProvider.Facebook, subject: 'fb-3', emailVerified: false };

    await assert.rejects(
      () => useCase.execute(command(OAuthProvider.Facebook)),
      (error: unknown) => error instanceof OAuthSignInFailedError && error.reason === OAuthSignInFailureReason.EmailMissing,
    );
    assert.equal(accounts.accounts.length, 0);
  });
});
