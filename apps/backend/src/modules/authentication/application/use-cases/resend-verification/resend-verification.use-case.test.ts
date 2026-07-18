import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GetAccountByEmailUseCase } from '../../../../identity/application/use-cases/get-account-by-email/get-account-by-email.use-case.js';
import { Account } from '../../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../../identity/domain/repositories/account.repository.js';
import type { AccountId } from '../../../../identity/domain/value-objects/account-id.value-object.js';
import { DisplayName } from '../../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../../identity/domain/value-objects/email-address.value-object.js';
import { AuthToken } from '../../../domain/entities/auth-token.entity.js';
import { Credential } from '../../../domain/entities/credential.entity.js';
import { TokenPurpose } from '../../../domain/enums/token-purpose.enum.js';
import { PasswordHash } from '../../../domain/value-objects/password-hash.value-object.js';
import type { AuthTokenRepository } from '../../../domain/repositories/auth-token.repository.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { EmailSenderPort } from '../../ports/email-sender.port.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import { ResendVerificationCommand } from './resend-verification.command.js';
import { ResendVerificationUseCase } from './resend-verification.use-case.js';

class FakeAccountRepository implements AccountRepository {
  constructor(private readonly account: Account | null) {}
  async findById(id: AccountId): Promise<Account | null> {
    return this.account && this.account.getId().equals(id) ? this.account : null;
  }
  async findByEmail(email: EmailAddress): Promise<Account | null> {
    return this.account && this.account.getEmail().toString() === email.toString() ? this.account : null;
  }
  async save(): Promise<void> {}
}

class FakeCredentialRepository implements CredentialRepository {
  constructor(private readonly credential: Credential | null) {}
  async findById(): Promise<Credential | null> {
    return this.credential;
  }
  async findByAccountId(accountId: string): Promise<Credential | null> {
    return this.credential && this.credential.getAccountId() === accountId ? this.credential : null;
  }
  async save(): Promise<void> {}
}

class FakeAuthTokenRepository implements AuthTokenRepository {
  public saved: AuthToken[] = [];
  async findActiveByHash(): Promise<AuthToken | null> {
    return null;
  }
  async save(token: AuthToken): Promise<void> {
    this.saved.push(token);
  }
}

class FakeTokenGenerator implements TokenGeneratorPort {
  generate(): string {
    return 'verification-token-00000000000000000';
  }
  hash(value: string): string {
    return `hashed-${value}`;
  }
}

class FakeEmailSender implements EmailSenderPort {
  public sent: { to: string; template: string }[] = [];
  async send(to: string, template: string): Promise<void> {
    this.sent.push({ to, template });
  }
}

function buildAccount(): Account {
  return Account.register({
    email: EmailAddress.create('patient@example.com'),
    role: AccountRole.Patient,
    displayName: DisplayName.create('Amina Youssef'),
  });
}

describe('ResendVerificationUseCase', () => {
  it('issues a new verification token and sends the email for an unverified account', async () => {
    const account = buildAccount();
    const credential = Credential.register({
      accountId: account.getId().toString(),
      passwordHash: PasswordHash.create('hashed-password'),
    });
    const authTokenRepository = new FakeAuthTokenRepository();
    const emailSender = new FakeEmailSender();

    const useCase = new ResendVerificationUseCase(
      new GetAccountByEmailUseCase(new FakeAccountRepository(account)),
      new FakeCredentialRepository(credential),
      authTokenRepository,
      new FakeTokenGenerator(),
      emailSender,
    );

    await useCase.execute(new ResendVerificationCommand({ email: 'patient@example.com' }));

    assert.equal(authTokenRepository.saved.length, 1);
    assert.equal(authTokenRepository.saved[0]?.getPurpose(), TokenPurpose.EmailVerification);
    assert.equal(emailSender.sent.length, 1);
    assert.equal(emailSender.sent[0]?.to, 'patient@example.com');
  });

  it('does nothing (no error) when no account matches the email', async () => {
    const authTokenRepository = new FakeAuthTokenRepository();
    const emailSender = new FakeEmailSender();

    const useCase = new ResendVerificationUseCase(
      new GetAccountByEmailUseCase(new FakeAccountRepository(null)),
      new FakeCredentialRepository(null),
      authTokenRepository,
      new FakeTokenGenerator(),
      emailSender,
    );

    await useCase.execute(new ResendVerificationCommand({ email: 'nobody@example.com' }));

    assert.equal(authTokenRepository.saved.length, 0);
    assert.equal(emailSender.sent.length, 0);
  });

  it('does nothing (no error, no email) when the account is already verified', async () => {
    const account = buildAccount();
    const credential = Credential.register({
      accountId: account.getId().toString(),
      passwordHash: PasswordHash.create('hashed-password'),
    });
    credential.verifyEmail();
    const authTokenRepository = new FakeAuthTokenRepository();
    const emailSender = new FakeEmailSender();

    const useCase = new ResendVerificationUseCase(
      new GetAccountByEmailUseCase(new FakeAccountRepository(account)),
      new FakeCredentialRepository(credential),
      authTokenRepository,
      new FakeTokenGenerator(),
      emailSender,
    );

    await useCase.execute(new ResendVerificationCommand({ email: 'patient@example.com' }));

    assert.equal(authTokenRepository.saved.length, 0);
    assert.equal(emailSender.sent.length, 0);
  });
});
