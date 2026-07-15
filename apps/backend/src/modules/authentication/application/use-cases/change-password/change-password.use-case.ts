import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { RecordSecurityEventCommand } from '../../../../trust/application/use-cases/record-security-event/record-security-event.command.js';
import { RecordSecurityEventUseCase } from '../../../../trust/application/use-cases/record-security-event/record-security-event.use-case.js';
import { SecurityEventType } from '../../../../trust/domain/enums/security-event-type.enum.js';
import { InvalidCredentialsError } from '../../../domain/exceptions/invalid-credentials.error.js';
import { PasswordHash } from '../../../domain/value-objects/password-hash.value-object.js';
import { PlainPassword } from '../../../domain/value-objects/plain-password.value-object.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import type { PasswordHasherPort } from '../../ports/password-hasher.port.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import type { ChangePasswordCommand } from './change-password.command.js';

// Authenticated flow (requires JwtAuthGuard upstream) — distinct from
// ResetPasswordUseCase in one key way: it revokes every OTHER session but
// keeps the session making this very request alive, so the user isn't
// immediately logged out of the device they're using right now.
export class ChangePasswordUseCase {
  constructor(
    private readonly credentialRepository: CredentialRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly recordSecurityEventUseCase: RecordSecurityEventUseCase,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const credential = await this.credentialRepository.findByAccountId(command.accountId);
    if (!credential) {
      throw new InvalidCredentialsError();
    }

    const currentMatches = await this.passwordHasher.verify(
      command.currentPassword,
      credential.getPasswordHash().toString(),
    );
    if (!currentMatches) {
      throw new InvalidCredentialsError();
    }

    const plainPassword = PlainPassword.create(command.newPassword);
    const newHash = PasswordHash.create(await this.passwordHasher.hash(plainPassword.toString()));
    credential.changePassword(newHash);
    await this.credentialRepository.save(credential);
    await this.eventDispatcher.dispatch(credential.releaseDomainEvents());

    if (command.currentRefreshToken) {
      const currentHash = TokenHash.create(this.tokenGenerator.hash(command.currentRefreshToken));
      const activeSessions = await this.sessionRepository.findAllActiveForCredential(credential.getId());
      for (const session of activeSessions) {
        if (!session.matchesRefreshTokenHash(currentHash)) {
          session.revoke();
          await this.sessionRepository.save(session);
          await this.eventDispatcher.dispatch(session.releaseDomainEvents());
        }
      }
    } else {
      await this.sessionRepository.revokeAllForCredential(credential.getId());
    }

    await this.recordSecurityEventUseCase.execute(
      new RecordSecurityEventCommand({
        accountId: credential.getAccountId(),
        eventType: SecurityEventType.PasswordChanged,
      }),
    );
  }
}
