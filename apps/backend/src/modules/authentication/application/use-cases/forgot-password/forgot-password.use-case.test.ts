import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

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
import type { AuthToken } from '../../../domain/entities/auth-token.entity.js';
import type { AuthTokenRepository } from '../../../domain/repositories/auth-token.repository.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import { PasswordHash } from '../../../domain/value-objects/password-hash.value-object.js';
import type { EmailSenderPort } from '../../ports/email-sender.port.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import { ForgotPasswordCommand } from './forgot-password.command.js';
import { ForgotPasswordUseCase } from './forgot-password.use-case.js';

class FakeAccountRepository implements AccountRepository {
  constructor(private readonly account: Account | null) {}
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
  constructor(private readonly credential: Credential | null) {}
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

class FakeTokenGenerator implements TokenGeneratorPort {
  generate(): string {
    return 'reset-token-00000000000000000000';
  }
  hash(plain: string): string {
    return `hash:${plain}`;
  }
}

class RecordingEmailSender implements EmailSenderPort {
  public readonly sent: { to: string; template: string }[] = [];
  async send(to: string, template: string): Promise<void> {
    this.sent.push({ to, template });
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

describe('ForgotPasswordUseCase', () => {
  it('issues a reset token and sends an email when the account exists', async () => {
    const account = Account.register({
      email: EmailAddress.create('ada@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Ada Lovelace'),
    });
    const credential = Credential.register({
      accountId: account.getId().toString(),
      passwordHash: PasswordHash.create('hashed'),
    });
    const authTokenRepository = new FakeAuthTokenRepository();
    const emailSender = new RecordingEmailSender();
    const securityEventRepository = new FakeSecurityEventRepository();
    const useCase = new ForgotPasswordUseCase(
      new GetAccountByEmailUseCase(new FakeAccountRepository(account)),
      new FakeCredentialRepository(credential),
      authTokenRepository,
      new FakeTokenGenerator(),
      emailSender,
      new RecordSecurityEventUseCase(securityEventRepository),
    );

    await useCase.execute(new ForgotPasswordCommand({ email: 'ada@example.com' }));

    assert.equal(authTokenRepository.saved.length, 1);
    assert.equal(emailSender.sent.length, 1);
    assert.equal(securityEventRepository.recorded.length, 1);
  });

  it('resolves silently, issuing no token, when no account matches the email (no user enumeration)', async () => {
    const authTokenRepository = new FakeAuthTokenRepository();
    const emailSender = new RecordingEmailSender();
    const useCase = new ForgotPasswordUseCase(
      new GetAccountByEmailUseCase(new FakeAccountRepository(null)),
      new FakeCredentialRepository(null),
      authTokenRepository,
      new FakeTokenGenerator(),
      emailSender,
      new RecordSecurityEventUseCase(new FakeSecurityEventRepository()),
    );

    await useCase.execute(new ForgotPasswordCommand({ email: 'nobody@example.com' }));

    assert.equal(authTokenRepository.saved.length, 0);
    assert.equal(emailSender.sent.length, 0);
  });
});
