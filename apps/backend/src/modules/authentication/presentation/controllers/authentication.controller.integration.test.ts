import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
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
import { SecurityEvent as SecurityEventEntity } from '../../../trust/domain/entities/security-event.entity.js';
import type { SecurityEvent } from '../../../trust/domain/entities/security-event.entity.js';
import { SecurityEventType } from '../../../trust/domain/enums/security-event-type.enum.js';
import type { SecurityEventRepository } from '../../../trust/domain/repositories/security-event.repository.js';
import { ListSecurityEventsForAccountUseCase } from '../../../trust/application/use-cases/list-security-events-for-account/list-security-events-for-account.use-case.js';
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
import { ListDeviceSessionsUseCase } from '../../application/use-cases/list-device-sessions/list-device-sessions.use-case.js';
import { ListLoginHistoryForAccountUseCase } from '../../application/use-cases/list-login-history-for-account/list-login-history-for-account.use-case.js';
import { LoginUseCase } from '../../application/use-cases/login/login.use-case.js';
import { LogoutAllSessionsUseCase } from '../../application/use-cases/logout-all-sessions/logout-all-sessions.use-case.js';
import { LogoutUseCase } from '../../application/use-cases/logout/logout.use-case.js';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session/refresh-session.use-case.js';
import { RegisterUseCase } from '../../application/use-cases/register/register.use-case.js';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password/reset-password.use-case.js';
import { RevokeDeviceSessionUseCase } from '../../application/use-cases/revoke-device-session/revoke-device-session.use-case.js';
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
  async findByAccountId(accountId: string): Promise<SecurityEvent[]> {
    return this.recorded.filter((event) => event.getAccountId() === accountId).sort((a, b) => b.getDetectedAt().getTime() - a.getDetectedAt().getTime());
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
  let sessionRepository: InMemorySessionRepository;
  let authTokenRepository: InMemoryAuthTokenRepository;
  let securityEventRepository: InMemorySecurityEventRepository;
  let emailSender: RecordingEmailSender;
  let tokenGenerator: FakeTokenGenerator;
  let jwtSigner: FakeJwtSigner;

  before(async () => {
    accountRepository = new InMemoryAccountRepository();
    credentialRepository = new InMemoryCredentialRepository();
    sessionRepository = new InMemorySessionRepository();
    authTokenRepository = new InMemoryAuthTokenRepository();
    securityEventRepository = new InMemorySecurityEventRepository();
    const passwordHasher = new FakePasswordHasher();
    tokenGenerator = new FakeTokenGenerator();
    jwtSigner = new FakeJwtSigner();
    emailSender = new RecordingEmailSender();
    const dispatcher = new NoopDomainEventDispatcher();

    const registerAccountUseCase = new RegisterAccountUseCase(accountRepository, dispatcher);
    const getAccountByIdUseCase = new GetAccountByIdUseCase(accountRepository);
    const getAccountByEmailUseCase = new GetAccountByEmailUseCase(accountRepository);
    const recordSecurityEventUseCase = new RecordSecurityEventUseCase(securityEventRepository);
    const listSecurityEventsForAccountUseCase = new ListSecurityEventsForAccountUseCase(securityEventRepository);

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
        {
          provide: ListDeviceSessionsUseCase,
          useValue: new ListDeviceSessionsUseCase(credentialRepository, sessionRepository, tokenGenerator),
        },
        {
          provide: RevokeDeviceSessionUseCase,
          useValue: new RevokeDeviceSessionUseCase(credentialRepository, sessionRepository, tokenGenerator),
        },
        {
          provide: LogoutAllSessionsUseCase,
          useValue: new LogoutAllSessionsUseCase(credentialRepository, sessionRepository),
        },
        {
          provide: ListLoginHistoryForAccountUseCase,
          useValue: new ListLoginHistoryForAccountUseCase(listSecurityEventsForAccountUseCase),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
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

  // --- Device sessions / logout-all / login-history -------------------------

  async function createVerifiedAccountWithCredential(email: string): Promise<{ accountId: string; credentialId: string }> {
    const account = Account.register({
      email: EmailAddressVO.create(email),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Session Test User'),
    });
    await accountRepository.save(account);
    const credential = Credential.register({
      accountId: account.getId().toString(),
      passwordHash: PasswordHash.create('hashed:Str0ngPassword'),
    });
    credential.recordSuccessfulLogin();
    await credentialRepository.save(credential);
    return { accountId: account.getId().toString(), credentialId: credential.getId() };
  }

  async function bearerTokenFor(accountId: string): Promise<string> {
    const signed = await jwtSigner.sign({ accountId, role: AccountRole.Patient });
    return `Bearer ${signed.token}`;
  }

  it('GET /auth/sessions lists only the caller active sessions and flags the current one', async () => {
    const { accountId, credentialId } = await createVerifiedAccountWithCredential('sessions-list@example.com');
    const currentSession = Session.create({
      credentialId,
      refreshTokenHash: TokenHash.create(tokenGenerator.hash('current-raw-token')),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const otherSession = Session.create({
      credentialId,
      refreshTokenHash: TokenHash.create(tokenGenerator.hash('other-raw-token')),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    await sessionRepository.save(currentSession);
    await sessionRepository.save(otherSession);

    const response = await request(app.getHttpServer())
      .get('/auth/sessions')
      .set('Authorization', await bearerTokenFor(accountId))
      .set('Cookie', [`orivex_refresh_token=current-raw-token`])
      .expect(200);

    const sessions = response.body.data as Array<{ id: string; isCurrent: boolean }>;
    assert.equal(sessions.length, 2);
    const current = sessions.find((s) => s.id === currentSession.getId());
    const other = sessions.find((s) => s.id === otherSession.getId());
    assert.equal(current?.isCurrent, true);
    assert.equal(other?.isCurrent, false);
  });

  it('GET /auth/sessions returns 401 without a bearer token', async () => {
    await request(app.getHttpServer()).get('/auth/sessions').expect(401);
  });

  it('DELETE /auth/sessions/:id returns 404 for a session belonging to a different account', async () => {
    const { accountId } = await createVerifiedAccountWithCredential('sessions-revoke-mine@example.com');
    const { credentialId: otherCredentialId } = await createVerifiedAccountWithCredential('sessions-revoke-theirs@example.com');
    const theirSession = Session.create({
      credentialId: otherCredentialId,
      refreshTokenHash: TokenHash.create(tokenGenerator.hash('their-raw-token')),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    await sessionRepository.save(theirSession);

    const response = await request(app.getHttpServer())
      .delete(`/auth/sessions/${theirSession.getId()}`)
      .set('Authorization', await bearerTokenFor(accountId))
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('DELETE /auth/sessions/:id rejects revoking the caller own current session with 422', async () => {
    const { accountId, credentialId } = await createVerifiedAccountWithCredential('sessions-revoke-current@example.com');
    const currentSession = Session.create({
      credentialId,
      refreshTokenHash: TokenHash.create(tokenGenerator.hash('self-raw-token')),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    await sessionRepository.save(currentSession);

    const response = await request(app.getHttpServer())
      .delete(`/auth/sessions/${currentSession.getId()}`)
      .set('Authorization', await bearerTokenFor(accountId))
      .set('Cookie', [`orivex_refresh_token=self-raw-token`])
      .expect(422);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it('DELETE /auth/sessions/:id revokes another one of the caller own sessions', async () => {
    const { accountId, credentialId } = await createVerifiedAccountWithCredential('sessions-revoke-other@example.com');
    const otherSession = Session.create({
      credentialId,
      refreshTokenHash: TokenHash.create(tokenGenerator.hash('to-revoke-token')),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    await sessionRepository.save(otherSession);

    await request(app.getHttpServer())
      .delete(`/auth/sessions/${otherSession.getId()}`)
      .set('Authorization', await bearerTokenFor(accountId))
      .expect(204);

    const reloaded = await sessionRepository.findById(otherSession.getId());
    assert.ok(reloaded?.getRevokedAt());
  });

  it('POST /auth/logout-all revokes every session and clears the refresh cookie', async () => {
    const { accountId, credentialId } = await createVerifiedAccountWithCredential('logout-all@example.com');
    const sessionA = Session.create({
      credentialId,
      refreshTokenHash: TokenHash.create(tokenGenerator.hash('logout-all-a')),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const sessionB = Session.create({
      credentialId,
      refreshTokenHash: TokenHash.create(tokenGenerator.hash('logout-all-b')),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    await sessionRepository.save(sessionA);
    await sessionRepository.save(sessionB);

    const response = await request(app.getHttpServer())
      .post('/auth/logout-all')
      .set('Authorization', await bearerTokenFor(accountId))
      .expect(204);

    assert.ok(String(response.headers['set-cookie']).includes('orivex_refresh_token=;'));
    const reloadedA = await sessionRepository.findById(sessionA.getId());
    const reloadedB = await sessionRepository.findById(sessionB.getId());
    assert.ok(reloadedA?.getRevokedAt());
    assert.ok(reloadedB?.getRevokedAt());
  });

  it('GET /auth/login-history returns only login-relevant events, most recent first', async () => {
    const { accountId } = await createVerifiedAccountWithCredential('login-history@example.com');
    const succeeded = SecurityEventEntity.record({ accountId, eventType: SecurityEventType.LoginSucceeded, ipAddress: '203.0.113.5' });
    const failed = SecurityEventEntity.record({ accountId, eventType: SecurityEventType.LoginFailed });
    const passwordChanged = SecurityEventEntity.record({ accountId, eventType: SecurityEventType.PasswordChanged });
    await securityEventRepository.record(succeeded);
    await securityEventRepository.record(failed);
    await securityEventRepository.record(passwordChanged);

    const response = await request(app.getHttpServer())
      .get('/auth/login-history')
      .set('Authorization', await bearerTokenFor(accountId))
      .expect(200);

    const entries = response.body.data as Array<{ id: string; outcome: string }>;
    assert.equal(entries.length, 2);
    const ids = entries.map((entry) => entry.id);
    assert.ok(ids.includes(succeeded.getId()));
    assert.ok(ids.includes(failed.getId()));
    assert.ok(!ids.includes(passwordChanged.getId()));
  });
});
