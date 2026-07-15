import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import type { DomainEventDispatcher } from '../../../../shared/domain/domain-event-dispatcher.js';
import { Account } from '../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../identity/domain/repositories/account.repository.js';
import { DisplayName } from '../../../identity/domain/value-objects/display-name.value-object.js';
import type { EmailAddress } from '../../../identity/domain/value-objects/email-address.value-object.js';
import { EmailAddress as EmailAddressVO } from '../../../identity/domain/value-objects/email-address.value-object.js';
import { GetAccountByEmailUseCase } from '../../../identity/application/use-cases/get-account-by-email/get-account-by-email.use-case.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { RegisterAccountUseCase } from '../../../identity/application/use-cases/register-account/register-account.use-case.js';
import type { SecurityEvent } from '../../../trust/domain/entities/security-event.entity.js';
import type { SecurityEventRepository } from '../../../trust/domain/repositories/security-event.repository.js';
import { RecordSecurityEventUseCase } from '../../../trust/application/use-cases/record-security-event/record-security-event.use-case.js';
import { AuthToken } from '../../domain/entities/auth-token.entity.js';
import { Credential } from '../../domain/entities/credential.entity.js';
import { Session } from '../../domain/entities/session.entity.js';
import { TokenPurpose } from '../../domain/enums/token-purpose.enum.js';
import type { AuthTokenRepository } from '../../domain/repositories/auth-token.repository.js';
import type { CredentialRepository } from '../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../domain/repositories/session.repository.js';
import { PasswordHash } from '../../domain/value-objects/password-hash.value-object.js';
import { TokenHash } from '../../domain/value-objects/token-hash.value-object.js';
import type { AccessTokenClaims, JwtSignerPort, SignedAccessToken } from '../../application/ports/jwt-signer.port.js';
import type { EmailSenderPort } from '../../application/ports/email-sender.port.js';
import type { PasswordHasherPort } from '../../application/ports/password-hasher.port.js';
import type { TokenGeneratorPort } from '../../application/ports/token-generator.port.js';
import { JWT_SIGNER } from '../../application/ports/tokens.js';
import { ChangePasswordUseCase } from '../../application/use-cases/change-password/change-password.use-case.js';
import { ForgotPasswordUseCase } from '../../application/use-cases/forgot-password/forgot-password.use-case.js';
import { GetCurrentSessionUseCase } from '../../application/use-cases/get-current-session/get-current-session.use-case.js';
import { LoginUseCase } from '../../application/use-cases/login/login.use-case.js';
import { LogoutUseCase } from '../../application/use-cases/logout/logout.use-case.js';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session/refresh-session.use-case.js';
import { RegisterUseCase } from '../../application/use-cases/register/register.use-case.js';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password/reset-password.use-case.js';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email/verify-email.use-case.js';

import { AuthenticationController } from './authentication.controller.js';

// --- In-memory doubles standing in for Prisma repositories/adapters --------

class InMemoryAccountRepository implements AccountRepository {
  private readonly byId = new Map<string, Account>();

  async findById(id: { toString(): string }): Promise<Account | null> {
    return this.byId.get(id.toString()) ?? null;
  }
  async findByEmail(email: EmailAddress): Promise<Account | null> {
    for (const account of this.byId.values()) {
      if (account.getEmail().equals(email)) {
        return account;
      }
    }
    return null;
  }
  async save(account: Account): Promise<void> {
    this.byId.set(account.getId().toString(), account);
  }
}

class InMemoryCredentialRepository implements CredentialRepository {
  private readonly byAccountId = new Map<string, Credential>();
  private readonly byId = new Map<string, Credential>();

  async findByAccountId(accountId: string): Promise<Credential | null> {
    return this.byAccountId.get(accountId) ?? null;
  }
  async findById(id: string): Promise<Credential | null> {
    return this.byId.get(id) ?? null;
  }
  async save(credential: Credential): Promise<void> {
    this.byAccountId.set(credential.getAccountId(), credential);
    this.byId.set(credential.getId(), credential);
  }
}

class InMemorySessionRepository implements SessionRepository {
  private readonly byId = new Map<string, Session>();

  async findById(id: string): Promise<Session | null> {
    return this.byId.get(id) ?? null;
  }
  async findByRefreshTokenHash(hash: TokenHash): Promise<Session | null> {
    for (const session of this.byId.values()) {
      if (session.matchesRefreshTokenHash(hash)) {
        return session;
      }
    }
    return null;
  }
  async findAllActiveForCredential(credentialId: string): Promise<Session[]> {
    return [...this.byId.values()].filter(
      (session) => session.getCredentialId() === credentialId && session.isActive(new Date()),
    );
  }
  async save(session: Session): Promise<void> {
    this.byId.set(session.getId(), session);
  }
  async revokeAllForCredential(credentialId: string): Promise<void> {
    for (const session of this.byId.values()) {
      if (session.getCredentialId() === credentialId) {
        session.revoke();
      }
    }
  }
}

class InMemoryAuthTokenRepository implements AuthTokenRepository {
  private readonly byHash = new Map<string, AuthToken>();

  async findActiveByHash(hash: TokenHash, purpose: TokenPurpose): Promise<AuthToken | null> {
    const token = this.byHash.get(hash.toString());
    if (!token || token.getPurpose() !== purpose || !token.isValid(new Date())) {
      return null;
    }
    return token;
  }
  async save(token: AuthToken): Promise<void> {
    this.byHash.set(token.getTokenHash().toString(), token);
  }
}

class InMemorySecurityEventRepository implements SecurityEventRepository {
  public readonly recorded: SecurityEvent[] = [];
  async record(event: SecurityEvent): Promise<void> {
    this.recorded.push(event);
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

class FakeJwtSigner implements JwtSignerPort {
  private readonly issued = new Map<string, AccessTokenClaims>();
  private counter = 0;

  async sign(claims: AccessTokenClaims): Promise<SignedAccessToken> {
    this.counter += 1;
    const token = `signed-jwt-${this.counter}`;
    this.issued.set(token, claims);
    return { token, expiresAt: new Date(Date.now() + 900_000) };
  }

  async verify(token: string): Promise<AccessTokenClaims> {
    const claims = this.issued.get(token);
    if (!claims) {
      throw new Error('invalid token');
    }
    return claims;
  }
}

class RecordingEmailSender implements EmailSenderPort {
  public readonly sent: { to: string; template: string; data: Record<string, unknown> }[] = [];
  async send(to: string, template: string, data: Record<string, unknown>): Promise<void> {
    this.sent.push({ to, template, data });
  }
}

class NoopDomainEventDispatcher implements DomainEventDispatcher {
  async dispatch(): Promise<void> {}
  subscribe(): void {}
}

describe('AuthenticationController (integration)', () => {
  let app: INestApplication;
  let accountRepository: InMemoryAccountRepository;
  let credentialRepository: InMemoryCredentialRepository;
  let authTokenRepository: InMemoryAuthTokenRepository;
  let securityEventRepository: InMemorySecurityEventRepository;
  let emailSender: RecordingEmailSender;

  before(async () => {
    accountRepository = new InMemoryAccountRepository();
    credentialRepository = new InMemoryCredentialRepository();
    const sessionRepository = new InMemorySessionRepository();
    authTokenRepository = new InMemoryAuthTokenRepository();
    securityEventRepository = new InMemorySecurityEventRepository();
    const passwordHasher = new FakePasswordHasher();
    const tokenGenerator = new FakeTokenGenerator();
    const jwtSigner = new FakeJwtSigner();
    emailSender = new RecordingEmailSender();
    const dispatcher = new NoopDomainEventDispatcher();

    const registerAccountUseCase = new RegisterAccountUseCase(accountRepository, dispatcher);
    const getAccountByIdUseCase = new GetAccountByIdUseCase(accountRepository);
    const getAccountByEmailUseCase = new GetAccountByEmailUseCase(accountRepository);
    const recordSecurityEventUseCase = new RecordSecurityEventUseCase(securityEventRepository);

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        PinoLoggerService,
        { provide: JWT_SIGNER, useValue: jwtSigner },
        { provide: ConfigService, useValue: { get: () => 'test' } },
        {
          provide: RegisterUseCase,
          useValue: new RegisterUseCase(
            registerAccountUseCase,
            credentialRepository,
            authTokenRepository,
            passwordHasher,
            tokenGenerator,
            emailSender,
            dispatcher,
          ),
        },
        {
          provide: LoginUseCase,
          useValue: new LoginUseCase(
            getAccountByEmailUseCase,
            credentialRepository,
            sessionRepository,
            passwordHasher,
            tokenGenerator,
            jwtSigner,
            recordSecurityEventUseCase,
            dispatcher,
          ),
        },
        {
          provide: LogoutUseCase,
          useValue: new LogoutUseCase(sessionRepository, tokenGenerator, dispatcher),
        },
        {
          provide: RefreshSessionUseCase,
          useValue: new RefreshSessionUseCase(
            sessionRepository,
            credentialRepository,
            tokenGenerator,
            jwtSigner,
            getAccountByIdUseCase,
            recordSecurityEventUseCase,
            dispatcher,
          ),
        },
        {
          provide: ForgotPasswordUseCase,
          useValue: new ForgotPasswordUseCase(
            getAccountByEmailUseCase,
            credentialRepository,
            authTokenRepository,
            tokenGenerator,
            emailSender,
            recordSecurityEventUseCase,
          ),
        },
        {
          provide: ResetPasswordUseCase,
          useValue: new ResetPasswordUseCase(
            authTokenRepository,
            credentialRepository,
            sessionRepository,
            passwordHasher,
            tokenGenerator,
            recordSecurityEventUseCase,
            dispatcher,
          ),
        },
        {
          provide: VerifyEmailUseCase,
          useValue: new VerifyEmailUseCase(authTokenRepository, credentialRepository, tokenGenerator, recordSecurityEventUseCase),
        },
        {
          provide: ChangePasswordUseCase,
          useValue: new ChangePasswordUseCase(
            credentialRepository,
            sessionRepository,
            passwordHasher,
            tokenGenerator,
            recordSecurityEventUseCase,
            dispatcher,
          ),
        },
        {
          provide: GetCurrentSessionUseCase,
          useValue: new GetCurrentSessionUseCase(getAccountByIdUseCase),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: createValidationException,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter(moduleRef.get(PinoLoggerService)));
    await app.init();
  });

  after(async () => {
    await app.close();
  });

  it('POST /auth/register creates an account, a credential, and an email-verification token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ fullName: 'Ada Lovelace', email: 'ada@example.com', password: 'Str0ngPassword' })
      .expect(201);

    assert.equal(response.body.data.status, 'verification_required');
    assert.equal(response.body.data.email, 'ada@example.com');
  });

  it('POST /auth/register rejects a weak password with 422', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ fullName: 'Weak Pw', email: 'weak@example.com', password: 'weak' })
      .expect(422);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it('POST /auth/login rejects invalid credentials with 401 INVALID_CREDENTIALS', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'WrongPassword1' })
      .expect(401);

    assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
  });

  it('POST /auth/verify-email, then POST /auth/login succeeds and sets the refresh cookie', async () => {
    const account = Account.register({
      email: EmailAddressVO.create('verified@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Verified User'),
    });
    await accountRepository.save(account);
    const credential = Credential.register({
      accountId: account.getId().toString(),
      passwordHash: PasswordHash.create('hashed:Str0ngPassword'),
    });
    const token = AuthToken.issue({
      credentialId: credential.getId(),
      tokenHash: TokenHash.create('hash:verify-me'),
      purpose: TokenPurpose.EmailVerification,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await credentialRepository.save(credential);
    await authTokenRepository.save(token);

    await request(app.getHttpServer()).post('/auth/verify-email').send({ token: 'verify-me' }).expect(200);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'verified@example.com', password: 'Str0ngPassword' })
      .expect(200);

    assert.equal(loginResponse.body.data.user.email, 'verified@example.com');
    assert.ok(loginResponse.body.data.accessToken);
    const setCookie = loginResponse.headers['set-cookie'];
    assert.ok(setCookie);
    assert.ok(String(setCookie).includes('orivex_refresh_token'));
  });

  it('GET /auth/me returns 401 without a bearer token', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /auth/session returns null (not 401) without a bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/auth/session').expect(200);

    assert.equal(response.body.data, null);
  });

  it('POST /auth/forgot-password always resolves 200, revealing nothing about account existence', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'nobody-at-all@example.com' })
      .expect(200);

    assert.equal(response.body.data.status, 'sent');
  });

  it('POST /auth/reset-password rejects an unknown token with 401 TOKEN_INVALID', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'unknown-token', password: 'NewStr0ngPassword' })
      .expect(401);

    assert.equal(response.body.error.code, 'TOKEN_INVALID');
  });
});
