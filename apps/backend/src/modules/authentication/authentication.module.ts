import { Module } from '@nestjs/common';

import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { GetAccountByEmailUseCase } from '../identity/application/use-cases/get-account-by-email/get-account-by-email.use-case.js';
import { GetAccountByIdUseCase } from '../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { RegisterAccountUseCase } from '../identity/application/use-cases/register-account/register-account.use-case.js';
import { IdentityModule } from '../identity/identity.module.js';
import { ListSecurityEventsForAccountUseCase } from '../trust/application/use-cases/list-security-events-for-account/list-security-events-for-account.use-case.js';
import { RecordSecurityEventUseCase } from '../trust/application/use-cases/record-security-event/record-security-event.use-case.js';
import { TrustModule } from '../trust/trust.module.js';

import { AuthenticationGuardsModule } from './authentication-guards.module.js';
import {
  AUTH_TOKEN_REPOSITORY,
  CREDENTIAL_REPOSITORY,
  EMAIL_SENDER,
  JWT_SIGNER,
  PASSWORD_HASHER,
  SESSION_REPOSITORY,
  TOKEN_GENERATOR,
} from './application/ports/tokens.js';
import type { AuthTokenRepository } from './domain/repositories/auth-token.repository.js';
import type { CredentialRepository } from './domain/repositories/credential.repository.js';
import type { SessionRepository } from './domain/repositories/session.repository.js';
import type { EmailSenderPort } from './application/ports/email-sender.port.js';
import type { JwtSignerPort } from './application/ports/jwt-signer.port.js';
import type { PasswordHasherPort } from './application/ports/password-hasher.port.js';
import type { TokenGeneratorPort } from './application/ports/token-generator.port.js';
import { ChangePasswordUseCase } from './application/use-cases/change-password/change-password.use-case.js';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password/forgot-password.use-case.js';
import { ResendVerificationUseCase } from './application/use-cases/resend-verification/resend-verification.use-case.js';
import { GetCurrentSessionUseCase } from './application/use-cases/get-current-session/get-current-session.use-case.js';
import { ListDeviceSessionsUseCase } from './application/use-cases/list-device-sessions/list-device-sessions.use-case.js';
import { ListLoginHistoryForAccountUseCase } from './application/use-cases/list-login-history-for-account/list-login-history-for-account.use-case.js';
import { LoginUseCase } from './application/use-cases/login/login.use-case.js';
import { LogoutAllSessionsUseCase } from './application/use-cases/logout-all-sessions/logout-all-sessions.use-case.js';
import { LogoutUseCase } from './application/use-cases/logout/logout.use-case.js';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session/refresh-session.use-case.js';
import { RegisterUseCase } from './application/use-cases/register/register.use-case.js';
import { ResetPasswordUseCase } from './application/use-cases/reset-password/reset-password.use-case.js';
import { RevokeDeviceSessionUseCase } from './application/use-cases/revoke-device-session/revoke-device-session.use-case.js';
import { VerifyEmailUseCase } from './application/use-cases/verify-email/verify-email.use-case.js';
import { Argon2PasswordHasher } from './infrastructure/crypto/argon2-password-hasher.js';
import { NodeTokenGenerator } from './infrastructure/crypto/node-token-generator.js';
import { LoggingEmailSender } from './infrastructure/email/logging-email-sender.js';
import { PrismaAuthTokenRepository } from './infrastructure/prisma/prisma-auth-token.repository.js';
import { PrismaCredentialRepository } from './infrastructure/prisma/prisma-credential.repository.js';
import { PrismaSessionRepository } from './infrastructure/prisma/prisma-session.repository.js';
import { AuthenticationController } from './presentation/controllers/authentication.controller.js';
import { DeviceSessionsController } from './presentation/controllers/device-sessions.controller.js';
import { LoginHistoryController } from './presentation/controllers/login-history.controller.js';

// Imports IdentityModule (RegisterAccountUseCase, GetAccountByIdUseCase,
// GetAccountByEmailUseCase) and TrustModule (RecordSecurityEventUseCase) to
// consume their exported use cases directly -- module-to-module calls only
// through explicitly published interfaces (docs/10-backend-architecture.md
// Section 3), never another module's repository.
//
// JWT_SIGNER/JwtAuthGuard/RolesGuard live in AuthenticationGuardsModule, not
// here -- that module has zero business-logic dependencies, so it can never
// be part of a module-import cycle. This module re-exports it (rather than
// re-declaring JwtModule/JWT_SIGNER itself) so any future module can protect
// a route the same way without depending on Authentication's own TrustModule
// dependency -- the seam the documented, future AuthModule (Phase 9 RBAC
// policy evaluation) will eventually build on top of.
@Module({
  imports: [IdentityModule, TrustModule, AuthenticationGuardsModule],
  controllers: [AuthenticationController, DeviceSessionsController, LoginHistoryController],
  providers: [
    { provide: CREDENTIAL_REPOSITORY, useClass: PrismaCredentialRepository },
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
    { provide: AUTH_TOKEN_REPOSITORY, useClass: PrismaAuthTokenRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_GENERATOR, useClass: NodeTokenGenerator },
    { provide: EMAIL_SENDER, useClass: LoggingEmailSender },
    {
      provide: RegisterUseCase,
      useFactory: (
        registerAccountUseCase: RegisterAccountUseCase,
        credentialRepository: CredentialRepository,
        authTokenRepository: AuthTokenRepository,
        passwordHasher: PasswordHasherPort,
        tokenGenerator: TokenGeneratorPort,
        emailSender: EmailSenderPort,
        eventDispatcher: DomainEventDispatcher,
      ) =>
        new RegisterUseCase(
          registerAccountUseCase,
          credentialRepository,
          authTokenRepository,
          passwordHasher,
          tokenGenerator,
          emailSender,
          eventDispatcher,
        ),
      inject: [
        RegisterAccountUseCase,
        CREDENTIAL_REPOSITORY,
        AUTH_TOKEN_REPOSITORY,
        PASSWORD_HASHER,
        TOKEN_GENERATOR,
        EMAIL_SENDER,
        DOMAIN_EVENT_DISPATCHER,
      ],
    },
    {
      provide: LoginUseCase,
      useFactory: (
        getAccountByEmailUseCase: GetAccountByEmailUseCase,
        credentialRepository: CredentialRepository,
        sessionRepository: SessionRepository,
        passwordHasher: PasswordHasherPort,
        tokenGenerator: TokenGeneratorPort,
        jwtSigner: JwtSignerPort,
        recordSecurityEventUseCase: RecordSecurityEventUseCase,
        eventDispatcher: DomainEventDispatcher,
      ) =>
        new LoginUseCase(
          getAccountByEmailUseCase,
          credentialRepository,
          sessionRepository,
          passwordHasher,
          tokenGenerator,
          jwtSigner,
          recordSecurityEventUseCase,
          eventDispatcher,
        ),
      inject: [
        GetAccountByEmailUseCase,
        CREDENTIAL_REPOSITORY,
        SESSION_REPOSITORY,
        PASSWORD_HASHER,
        TOKEN_GENERATOR,
        JWT_SIGNER,
        RecordSecurityEventUseCase,
        DOMAIN_EVENT_DISPATCHER,
      ],
    },
    {
      provide: LogoutUseCase,
      useFactory: (sessionRepository: SessionRepository, tokenGenerator: TokenGeneratorPort, eventDispatcher: DomainEventDispatcher) =>
        new LogoutUseCase(sessionRepository, tokenGenerator, eventDispatcher),
      inject: [SESSION_REPOSITORY, TOKEN_GENERATOR, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: RefreshSessionUseCase,
      useFactory: (
        sessionRepository: SessionRepository,
        credentialRepository: CredentialRepository,
        tokenGenerator: TokenGeneratorPort,
        jwtSigner: JwtSignerPort,
        getAccountByIdUseCase: GetAccountByIdUseCase,
        recordSecurityEventUseCase: RecordSecurityEventUseCase,
        eventDispatcher: DomainEventDispatcher,
      ) =>
        new RefreshSessionUseCase(
          sessionRepository,
          credentialRepository,
          tokenGenerator,
          jwtSigner,
          getAccountByIdUseCase,
          recordSecurityEventUseCase,
          eventDispatcher,
        ),
      inject: [
        SESSION_REPOSITORY,
        CREDENTIAL_REPOSITORY,
        TOKEN_GENERATOR,
        JWT_SIGNER,
        GetAccountByIdUseCase,
        RecordSecurityEventUseCase,
        DOMAIN_EVENT_DISPATCHER,
      ],
    },
    {
      provide: ForgotPasswordUseCase,
      useFactory: (
        getAccountByEmailUseCase: GetAccountByEmailUseCase,
        credentialRepository: CredentialRepository,
        authTokenRepository: AuthTokenRepository,
        tokenGenerator: TokenGeneratorPort,
        emailSender: EmailSenderPort,
        recordSecurityEventUseCase: RecordSecurityEventUseCase,
      ) =>
        new ForgotPasswordUseCase(
          getAccountByEmailUseCase,
          credentialRepository,
          authTokenRepository,
          tokenGenerator,
          emailSender,
          recordSecurityEventUseCase,
        ),
      inject: [
        GetAccountByEmailUseCase,
        CREDENTIAL_REPOSITORY,
        AUTH_TOKEN_REPOSITORY,
        TOKEN_GENERATOR,
        EMAIL_SENDER,
        RecordSecurityEventUseCase,
      ],
    },
    {
      provide: ResendVerificationUseCase,
      useFactory: (
        getAccountByEmailUseCase: GetAccountByEmailUseCase,
        credentialRepository: CredentialRepository,
        authTokenRepository: AuthTokenRepository,
        tokenGenerator: TokenGeneratorPort,
        emailSender: EmailSenderPort,
      ) =>
        new ResendVerificationUseCase(
          getAccountByEmailUseCase,
          credentialRepository,
          authTokenRepository,
          tokenGenerator,
          emailSender,
        ),
      inject: [GetAccountByEmailUseCase, CREDENTIAL_REPOSITORY, AUTH_TOKEN_REPOSITORY, TOKEN_GENERATOR, EMAIL_SENDER],
    },
    {
      provide: ResetPasswordUseCase,
      useFactory: (
        authTokenRepository: AuthTokenRepository,
        credentialRepository: CredentialRepository,
        sessionRepository: SessionRepository,
        passwordHasher: PasswordHasherPort,
        tokenGenerator: TokenGeneratorPort,
        recordSecurityEventUseCase: RecordSecurityEventUseCase,
        eventDispatcher: DomainEventDispatcher,
      ) =>
        new ResetPasswordUseCase(
          authTokenRepository,
          credentialRepository,
          sessionRepository,
          passwordHasher,
          tokenGenerator,
          recordSecurityEventUseCase,
          eventDispatcher,
        ),
      inject: [
        AUTH_TOKEN_REPOSITORY,
        CREDENTIAL_REPOSITORY,
        SESSION_REPOSITORY,
        PASSWORD_HASHER,
        TOKEN_GENERATOR,
        RecordSecurityEventUseCase,
        DOMAIN_EVENT_DISPATCHER,
      ],
    },
    {
      provide: VerifyEmailUseCase,
      useFactory: (
        authTokenRepository: AuthTokenRepository,
        credentialRepository: CredentialRepository,
        tokenGenerator: TokenGeneratorPort,
        recordSecurityEventUseCase: RecordSecurityEventUseCase,
      ) => new VerifyEmailUseCase(authTokenRepository, credentialRepository, tokenGenerator, recordSecurityEventUseCase),
      inject: [AUTH_TOKEN_REPOSITORY, CREDENTIAL_REPOSITORY, TOKEN_GENERATOR, RecordSecurityEventUseCase],
    },
    {
      provide: ChangePasswordUseCase,
      useFactory: (
        credentialRepository: CredentialRepository,
        sessionRepository: SessionRepository,
        passwordHasher: PasswordHasherPort,
        tokenGenerator: TokenGeneratorPort,
        recordSecurityEventUseCase: RecordSecurityEventUseCase,
        eventDispatcher: DomainEventDispatcher,
      ) =>
        new ChangePasswordUseCase(
          credentialRepository,
          sessionRepository,
          passwordHasher,
          tokenGenerator,
          recordSecurityEventUseCase,
          eventDispatcher,
        ),
      inject: [
        CREDENTIAL_REPOSITORY,
        SESSION_REPOSITORY,
        PASSWORD_HASHER,
        TOKEN_GENERATOR,
        RecordSecurityEventUseCase,
        DOMAIN_EVENT_DISPATCHER,
      ],
    },
    {
      provide: GetCurrentSessionUseCase,
      useFactory: (getAccountByIdUseCase: GetAccountByIdUseCase) => new GetCurrentSessionUseCase(getAccountByIdUseCase),
      inject: [GetAccountByIdUseCase],
    },
    {
      provide: ListDeviceSessionsUseCase,
      useFactory: (credentialRepository: CredentialRepository, sessionRepository: SessionRepository, tokenGenerator: TokenGeneratorPort) =>
        new ListDeviceSessionsUseCase(credentialRepository, sessionRepository, tokenGenerator),
      inject: [CREDENTIAL_REPOSITORY, SESSION_REPOSITORY, TOKEN_GENERATOR],
    },
    {
      provide: RevokeDeviceSessionUseCase,
      useFactory: (credentialRepository: CredentialRepository, sessionRepository: SessionRepository, tokenGenerator: TokenGeneratorPort) =>
        new RevokeDeviceSessionUseCase(credentialRepository, sessionRepository, tokenGenerator),
      inject: [CREDENTIAL_REPOSITORY, SESSION_REPOSITORY, TOKEN_GENERATOR],
    },
    {
      provide: LogoutAllSessionsUseCase,
      useFactory: (credentialRepository: CredentialRepository, sessionRepository: SessionRepository) =>
        new LogoutAllSessionsUseCase(credentialRepository, sessionRepository),
      inject: [CREDENTIAL_REPOSITORY, SESSION_REPOSITORY],
    },
    {
      provide: ListLoginHistoryForAccountUseCase,
      useFactory: (listSecurityEventsForAccountUseCase: ListSecurityEventsForAccountUseCase) =>
        new ListLoginHistoryForAccountUseCase(listSecurityEventsForAccountUseCase),
      inject: [ListSecurityEventsForAccountUseCase],
    },
  ],
  exports: [AuthenticationGuardsModule],
})
export class AuthenticationModule {}
