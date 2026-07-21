import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { Account } from '../../../../identity/domain/entities/account.entity.js';
import { GetAccountByEmailUseCase } from '../../../../identity/application/use-cases/get-account-by-email/get-account-by-email.use-case.js';
import { RecordSecurityEventCommand } from '../../../../trust/application/use-cases/record-security-event/record-security-event.command.js';
import { RecordSecurityEventUseCase } from '../../../../trust/application/use-cases/record-security-event/record-security-event.use-case.js';
import { SecurityEventType } from '../../../../trust/domain/enums/security-event-type.enum.js';
import { Session } from '../../../domain/entities/session.entity.js';
import { REFRESH_TOKEN_TTL_DAYS } from '../../../domain/constants/authentication.constants.js';
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
      // enumeration via a differently-shaped failure.
      throw new InvalidCredentialsError();
    }

    const credential = await this.credentialRepository.findByAccountId(account.getId().toString());
    if (!credential) {
      throw new InvalidCredentialsError();
    }

    const now = new Date();
    if (credential.isLocked(now)) {
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

    return {
      account,
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken: plainRefreshToken.toString(),
      refreshTokenExpiresAt: session.getExpiresAt(),
    };
  }
}
