import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import type { RevokeOtherSessionsCommand } from './revoke-other-sessions.command.js';

export type RevokeOtherSessionsResult = 'not_found' | 'ok';

// Sibling to LogoutAllSessionsUseCase, but excludes the caller's own current
// session instead of revoking everything -- "sign out all OTHER devices",
// keeping the caller logged in here. Without a currentRefreshToken (e.g. no
// refresh cookie present), every active session is revoked, since there is
// then no session to identify as "this device" to spare.
export class RevokeOtherSessionsUseCase {
  constructor(
    private readonly credentialRepository: CredentialRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly tokenGenerator: TokenGeneratorPort,
  ) {}

  async execute(command: RevokeOtherSessionsCommand): Promise<RevokeOtherSessionsResult> {
    const credential = await this.credentialRepository.findByAccountId(command.accountId);
    if (!credential) {
      return 'not_found';
    }

    const currentHash = command.currentRefreshToken
      ? TokenHash.create(this.tokenGenerator.hash(command.currentRefreshToken))
      : undefined;

    const activeSessions = await this.sessionRepository.findAllActiveForCredential(credential.getId());
    for (const session of activeSessions) {
      if (currentHash && session.matchesRefreshTokenHash(currentHash)) {
        continue;
      }
      session.revoke();
      await this.sessionRepository.save(session);
    }

    return 'ok';
  }
}
