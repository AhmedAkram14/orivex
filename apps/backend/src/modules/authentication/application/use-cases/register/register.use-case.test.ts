import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { Account } from '../../../../identity/domain/entities/account.entity.js';
import type { AccountRepository } from '../../../../identity/domain/repositories/account.repository.js';
import { RegisterAccountUseCase } from '../../../../identity/application/use-cases/register-account/register-account.use-case.js';
import type { Credential } from '../../../domain/entities/credential.entity.js';
import type { AuthToken } from '../../../domain/entities/auth-token.entity.js';
import { TokenPurpose } from '../../../domain/enums/token-purpose.enum.js';
import type { AuthTokenRepository } from '../../../domain/repositories/auth-token.repository.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { EmailSenderPort } from '../../ports/email-sender.port.js';
import type { PasswordHasherPort } from '../../ports/password-hasher.port.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import { RegisterCommand } from './register.command.js';
import { RegisterUseCase } from './register.use-case.js';

class FakeAccountRepository implements AccountRepository {
  findById(): Promise<Account | null> {
    return Promise.resolve(null);
  }
  findByEmail(): Promise<Account | null> {
    return Promise.resolve(null);
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeCredentialRepository implements CredentialRepository {
  public readonly saved: Credential[] = [];
  findByAccountId(): Promise<Credential | null> {
    return Promise.resolve(null);
  }
  findById(): Promise<Credential | null> {
    return Promise.resolve(null);
  }
  save(credential: Credential): Promise<void> {
    this.saved.push(credential);
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

class FakePasswordHasher implements PasswordHasherPort {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

class FakeTokenGenerator implements TokenGeneratorPort {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return `plain-token-${this.counter}-0000000000000000`;
  }
  hash(plain: string): string {
    return `hash:${plain}`;
  }
}

class RecordingEmailSender implements EmailSenderPort {
  public readonly sent: { to: string; template: string; data: Record<string, unknown> }[] = [];
  async send(to: string, template: string, data: Record<string, unknown>): Promise<void> {
    this.sent.push({ to, template, data });
  }
}

class RecordingDispatcher implements DomainEventDispatcher {
  public readonly dispatched: unknown[] = [];
  async dispatch(events: unknown[]): Promise<void> {
    this.dispatched.push(...events);
  }
  subscribe(): void {}
}

describe('RegisterUseCase', () => {
  it('creates an Identity account, a Credential, issues a verification token, and sends the email', async () => {
    const credentialRepository = new FakeCredentialRepository();
    const authTokenRepository = new FakeAuthTokenRepository();
    const emailSender = new RecordingEmailSender();
    const dispatcher = new RecordingDispatcher();
    const useCase = new RegisterUseCase(
      new RegisterAccountUseCase(new FakeAccountRepository(), dispatcher),
      credentialRepository,
      authTokenRepository,
      new FakePasswordHasher(),
      new FakeTokenGenerator(),
      emailSender,
      dispatcher,
    );

    const result = await useCase.execute(
      new RegisterCommand({ fullName: 'Ada Lovelace', email: 'ada@example.com', password: 'Str0ngPassword' }),
    );

    assert.equal(result.email, 'ada@example.com');
    assert.equal(credentialRepository.saved.length, 1);
    assert.equal(credentialRepository.saved[0].getAccountId(), result.accountId);
    assert.equal(authTokenRepository.saved.length, 1);
    assert.equal(authTokenRepository.saved[0].getPurpose(), TokenPurpose.EmailVerification);
    assert.equal(emailSender.sent.length, 1);
    assert.equal(emailSender.sent[0].to, 'ada@example.com');
    assert.equal(emailSender.sent[0].template, 'email-verification');
  });

  it('rejects a weak password before ever touching the account repository', async () => {
    const credentialRepository = new FakeCredentialRepository();
    const dispatcher = new RecordingDispatcher();
    const useCase = new RegisterUseCase(
      new RegisterAccountUseCase(new FakeAccountRepository(), dispatcher),
      credentialRepository,
      new FakeAuthTokenRepository(),
      new FakePasswordHasher(),
      new FakeTokenGenerator(),
      new RecordingEmailSender(),
      dispatcher,
    );

    await assert.rejects(() =>
      useCase.execute(new RegisterCommand({ fullName: 'Ada', email: 'ada@example.com', password: 'weak' })),
    );

    assert.equal(credentialRepository.saved.length, 0);
  });
});
