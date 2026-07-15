import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { RecordSecurityEventCommand } from '../../../../trust/application/use-cases/record-security-event/record-security-event.command.js';
import { RecordSecurityEventUseCase } from '../../../../trust/application/use-cases/record-security-event/record-security-event.use-case.js';
import { SecurityEventType } from '../../../../trust/domain/enums/security-event-type.enum.js';
import { TokenPurpose } from '../../../domain/enums/token-purpose.enum.js';
import { TokenExpiredError } from '../../../domain/exceptions/token-expired.error.js';
import { TokenInvalidError } from '../../../domain/exceptions/token-invalid.error.js';
import { PasswordHash } from '../../../domain/value-objects/password-hash.value-object.js';
import { PlainPassword } from '../../../domain/value-objects/plain-password.value-object.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { AuthTokenRepository } from '../../../domain/repositories/auth-token.repository.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import type { PasswordHasherPort } from '../../ports/password-hasher.port.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import type { ResetPasswordCommand } from './reset-password.command.js';

export class ResetPasswordUseCase {
  constructor(
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly credentialRepository: CredentialRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly recordSecurityEventUseCase: RecordSecurityEventUseCase,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    const presentedHash = TokenHash.create(this.tokenGenerator.hash(command.token));
    const token = await this.authTokenRepository.findActiveByHash(presentedHash, TokenPurpose.PasswordReset);
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

    const plainPassword = PlainPassword.create(command.password);
    const newHash = PasswordHash.create(await this.passwordHasher.hash(plainPassword.toString()));
    credential.changePassword(newHash);
    await this.credentialRepository.save(credential);
    await this.eventDispatcher.dispatch(credential.releaseDomainEvents());

    token.markUsed();
    await this.authTokenRepository.save(token);

    // A password reset invalidates every existing session, not just the one
    // that requested it — the whole point of a reset is "I may have lost
    // control of my credentials," which a still-live session elsewhere
    // would undermine.
    await this.sessionRepository.revokeAllForCredential(credential.getId());

    await this.recordSecurityEventUseCase.execute(
      new RecordSecurityEventCommand({
        accountId: credential.getAccountId(),
        eventType: SecurityEventType.PasswordResetCompleted,
      }),
    );
  }
}
