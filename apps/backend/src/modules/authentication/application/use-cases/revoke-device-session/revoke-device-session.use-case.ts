import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import type { RevokeDeviceSessionCommand } from './revoke-device-session.command.js';

// A discriminated result instead of thrown domain errors -- the two failure
// shapes (not-found vs. "that's your own current session") map to two
// different HTTP statuses (404 vs 422) at the controller, and neither is a
// truly exceptional condition for the use case's own logic.
export type RevokeDeviceSessionResult = 'not_found' | 'cannot_revoke_current' | 'revoked';

export class RevokeDeviceSessionUseCase {
  constructor(
    private readonly credentialRepository: CredentialRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly tokenGenerator: TokenGeneratorPort,
  ) {}

  async execute(command: RevokeDeviceSessionCommand): Promise<RevokeDeviceSessionResult> {
    const credential = await this.credentialRepository.findByAccountId(command.accountId);
    if (!credential) {
      return 'not_found';
    }

    const session = await this.sessionRepository.findById(command.sessionId);
    // Never leak whether a session id belongs to a different account --
    // both "doesn't exist" and "belongs to someone else" resolve the same
    // way, mirroring MarkNotificationReadUseCase's ownership check.
    if (!session || session.getCredentialId() !== credential.getId()) {
      return 'not_found';
    }

    if (command.currentRefreshToken) {
      const currentHash = TokenHash.create(this.tokenGenerator.hash(command.currentRefreshToken));
      if (session.matchesRefreshTokenHash(currentHash)) {
        return 'cannot_revoke_current';
      }
    }

    session.revoke();
    await this.sessionRepository.save(session);
    return 'revoked';
  }
}
