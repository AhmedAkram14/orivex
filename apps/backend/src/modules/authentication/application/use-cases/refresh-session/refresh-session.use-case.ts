import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { RecordSecurityEventCommand } from '../../../../trust/application/use-cases/record-security-event/record-security-event.command.js';
import { RecordSecurityEventUseCase } from '../../../../trust/application/use-cases/record-security-event/record-security-event.use-case.js';
import { SecurityEventType } from '../../../../trust/domain/enums/security-event-type.enum.js';
import { REFRESH_TOKEN_TTL_DAYS } from '../../../domain/constants/authentication.constants.js';
import { TokenExpiredError } from '../../../domain/exceptions/token-expired.error.js';
import { TokenInvalidError } from '../../../domain/exceptions/token-invalid.error.js';
import { PlainToken } from '../../../domain/value-objects/plain-token.value-object.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import type { JwtSignerPort } from '../../ports/jwt-signer.port.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import type { RefreshSessionCommand } from './refresh-session.command.js';

export interface RefreshSessionResult {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

// Rotates the refresh token on every use and detects reuse of an
// already-rotated/revoked token as a compromise signal — a stolen refresh
// token that gets used after the legitimate client has already rotated past
// it causes every session for that credential to be revoked, not just this one.
export class RefreshSessionUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly credentialRepository: CredentialRepository,
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly jwtSigner: JwtSignerPort,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly recordSecurityEventUseCase: RecordSecurityEventUseCase,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: RefreshSessionCommand): Promise<RefreshSessionResult> {
    const presentedHash = TokenHash.create(this.tokenGenerator.hash(command.refreshToken));
    const session = await this.sessionRepository.findByRefreshTokenHash(presentedHash);

    if (!session) {
      throw new TokenInvalidError();
    }

    const credential = await this.credentialRepository.findById(session.getCredentialId());
    if (!credential) {
      throw new TokenInvalidError();
    }

    if (session.getRevokedAt() !== undefined) {
      await this.sessionRepository.revokeAllForCredential(credential.getId());
      await this.recordSecurityEventUseCase.execute(
        new RecordSecurityEventCommand({
          accountId: credential.getAccountId(),
          eventType: SecurityEventType.RefreshTokenReuseDetected,
        }),
      );
      throw new TokenInvalidError();
    }

    if (!session.isActive(new Date())) {
      throw new TokenExpiredError();
    }

    const account = await this.getAccountByIdUseCase.execute({ accountId: credential.getAccountId() });
    if (!account) {
      throw new TokenInvalidError();
    }

    const plainRefreshToken = PlainToken.create(this.tokenGenerator.generate());
    const newHash = TokenHash.create(this.tokenGenerator.hash(plainRefreshToken.toString()));
    session.rotate(newHash, new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86_400_000));
    await this.sessionRepository.save(session);
    await this.eventDispatcher.dispatch(session.releaseDomainEvents());

    const accessToken = await this.jwtSigner.sign({
      accountId: account.getId().toString(),
      role: account.getRole(),
    });

    return {
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken: plainRefreshToken.toString(),
      refreshTokenExpiresAt: session.getExpiresAt(),
    };
  }
}
