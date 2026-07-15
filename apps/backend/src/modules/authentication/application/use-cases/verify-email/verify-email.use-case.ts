import { RecordSecurityEventCommand } from '../../../../trust/application/use-cases/record-security-event/record-security-event.command.js';
import { RecordSecurityEventUseCase } from '../../../../trust/application/use-cases/record-security-event/record-security-event.use-case.js';
import { SecurityEventType } from '../../../../trust/domain/enums/security-event-type.enum.js';
import { TokenPurpose } from '../../../domain/enums/token-purpose.enum.js';
import { TokenExpiredError } from '../../../domain/exceptions/token-expired.error.js';
import { TokenInvalidError } from '../../../domain/exceptions/token-invalid.error.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { AuthTokenRepository } from '../../../domain/repositories/auth-token.repository.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import type { VerifyEmailCommand } from './verify-email.command.js';

export class VerifyEmailUseCase {
  constructor(
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly credentialRepository: CredentialRepository,
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly recordSecurityEventUseCase: RecordSecurityEventUseCase,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<void> {
    const presentedHash = TokenHash.create(this.tokenGenerator.hash(command.token));
    const token = await this.authTokenRepository.findActiveByHash(presentedHash, TokenPurpose.EmailVerification);
    if (!token) {
      throw new TokenInvalidError();
    }
    if (!token.isValid(new Date())) {
      throw new TokenExpiredError();
    }

    const credential = await this.credentialRepository.findById(token.getCredentialId());
    if (!credential) {
      throw new TokenInvalidError();
    }

    credential.verifyEmail();
    await this.credentialRepository.save(credential);

    token.markUsed();
    await this.authTokenRepository.save(token);

    await this.recordSecurityEventUseCase.execute(
      new RecordSecurityEventCommand({
        accountId: credential.getAccountId(),
        eventType: SecurityEventType.EmailVerified,
      }),
    );
  }
}
