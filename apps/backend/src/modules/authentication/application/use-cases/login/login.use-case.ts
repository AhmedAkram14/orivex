import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { parseUserAgent } from '../../../../../platform/http/parse-user-agent.js';
import { resolveIpLocation } from '../../../../../platform/http/resolve-ip-location.js';
import type { Account } from '../../../../identity/domain/entities/account.entity.js';
import { GetAccountByEmailUseCase } from '../../../../identity/application/use-cases/get-account-by-email/get-account-by-email.use-case.js';
import { RecordSecurityEventCommand } from '../../../../trust/application/use-cases/record-security-event/record-security-event.command.js';
import { RecordSecurityEventUseCase } from '../../../../trust/application/use-cases/record-security-event/record-security-event.use-case.js';
import { SecurityEventType } from '../../../../trust/domain/enums/security-event-type.enum.js';
import { Session } from '../../../domain/entities/session.entity.js';
import { REFRESH_TOKEN_TTL_DAYS } from '../../../domain/constants/authentication.constants.js';
import { LoginFailureReason } from '../../../domain/enums/login-failure-reason.enum.js';
import { NewDeviceLoginDetectedEvent } from '../../../domain/events/new-device-login-detected.event.js';
import { AccountLockedError } from '../../../domain/exceptions/account-locked.error.js';
import { EmailNotVerifiedError } from '../../../domain/exceptions/email-not-verified.error.js';
import { InvalidCredentialsError } from '../../../domain/exceptions/invalid-credentials.error.js';
import { PlainToken } from '../../../domain/value-objects/plain-token.value-object.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import type { JwtSignerPort } from '../../ports/jwt-signer.port.js';
import type { PasswordHasherPort } from '../../ports/password-hasher.port.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import type { LoginCommand } from './login.command.js';

export interface LoginResult {
  account: Account;
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export class LoginUseCase {
  constructor(
    private readonly getAccountByEmailUseCase: GetAccountByEmailUseCase,
    private readonly credentialRepository: CredentialRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly jwtSigner: JwtSignerPort,
    private readonly recordSecurityEventUseCase: RecordSecurityEventUseCase,
    private readonly eventDispatcher: DomainEventDispatcher,
    // A reversible, env-var-gated bypass (SKIP_EMAIL_VERIFICATION,
    // defaults false/enforced) -- see env.schema.ts's own comment for
    // why this exists and why it must never stay "true" anywhere real
    // patient data exists.
    private readonly skipEmailVerification: boolean = false,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const account = await this.getAccountByEmailUseCase.execute({ email: command.email });
    if (!account) {
      // Deliberately the same error as "wrong password" — no user
      // enumeration via a differently-shaped failure. There is also no
      // account to attach a SecurityEvent to (accountId is a required,
      // non-empty field on that aggregate) -- an "unknown_user" attempt
      // is therefore never recorded anywhere, which is itself correct:
      // no account's own login-history view could ever legitimately show
      // an attempt against an email that isn't theirs.
      throw new InvalidCredentialsError();
    }

    const credential = await this.credentialRepository.findByAccountId(account.getId().toString());
    if (!credential) {
      throw new InvalidCredentialsError();
    }

    const now = new Date();
    if (credential.isLocked(now)) {
      await this.recordSecurityEventUseCase.execute(
        new RecordSecurityEventCommand({
          accountId: account.getId().toString(),
          eventType: SecurityEventType.AccountLocked,
          ipAddress: command.ipAddress,
          userAgent: command.userAgent,
          metadata: { reason: LoginFailureReason.Locked },
        }),
      );
      throw new AccountLockedError(credential.getLockedUntil() as Date);
    }

    const passwordMatches = await this.passwordHasher.verify(
      command.password,
      credential.getPasswordHash().toString(),
    );

    if (!passwordMatches) {
      credential.recordFailedLogin();
      const justLocked = credential.isLocked(new Date());
      await this.credentialRepository.save(credential);
      await this.eventDispatcher.dispatch(credential.releaseDomainEvents());
      await this.recordSecurityEventUseCase.execute(
        new RecordSecurityEventCommand({
          accountId: account.getId().toString(),
          eventType: justLocked ? SecurityEventType.AccountLocked : SecurityEventType.LoginFailed,
          ipAddress: command.ipAddress,
          userAgent: command.userAgent,
          metadata: { reason: justLocked ? LoginFailureReason.Locked : LoginFailureReason.WrongPassword },
        }),
      );
      throw new InvalidCredentialsError();
    }

    if (!this.skipEmailVerification && !credential.isEmailVerified()) {
      throw new EmailNotVerifiedError();
    }

    credential.recordSuccessfulLogin();
    await this.credentialRepository.save(credential);
    await this.eventDispatcher.dispatch(credential.releaseDomainEvents());
    await this.recordSecurityEventUseCase.execute(
      new RecordSecurityEventCommand({
        accountId: account.getId().toString(),
        eventType: SecurityEventType.LoginSucceeded,
        ipAddress: command.ipAddress,
        userAgent: command.userAgent,
      }),
    );

    // Best-effort "is this a new device" heuristic -- compares the parsed
    // UA displayName + exact IP against the account's other still-active
    // sessions (created BEFORE this one). Not a cryptographic device
    // fingerprint: a browser update or a new IP on a familiar laptop both
    // read as "new". Skipped entirely on an account's very first-ever
    // session (nothing to compare against, and a first login isn't
    // suspicious) to avoid emailing every brand-new signup.
    const priorActiveSessions = await this.sessionRepository.findAllActiveForCredential(credential.getId());
    const currentUa = parseUserAgent(command.userAgent);
    const isNewDevice =
      priorActiveSessions.length > 0 &&
      !priorActiveSessions.some((existing) => {
        const existingUa = parseUserAgent(existing.getUserAgent());
        return existingUa.displayName === currentUa.displayName && existing.getIpAddress() === command.ipAddress;
      });

    const accessToken = await this.jwtSigner.sign({
      accountId: account.getId().toString(),
      role: account.getRole(),
    });

    const plainRefreshToken = PlainToken.create(this.tokenGenerator.generate());
    const refreshTokenHash = TokenHash.create(this.tokenGenerator.hash(plainRefreshToken.toString()));
    const session = Session.create({
      credentialId: credential.getId(),
      refreshTokenHash,
      userAgent: command.userAgent,
      ipAddress: command.ipAddress,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86_400_000),
    });
    await this.sessionRepository.save(session);
    await this.eventDispatcher.dispatch(session.releaseDomainEvents());

    if (isNewDevice) {
      const location = command.ipAddress ? resolveIpLocation(command.ipAddress) : null;
      await this.eventDispatcher.dispatch([
        new NewDeviceLoginDetectedEvent(account.getId().toString(), currentUa.displayName, location?.city, location?.country),
      ]);
    }

    return {
      account,
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken: plainRefreshToken.toString(),
      refreshTokenExpiresAt: session.getExpiresAt(),
    };
  }
}
