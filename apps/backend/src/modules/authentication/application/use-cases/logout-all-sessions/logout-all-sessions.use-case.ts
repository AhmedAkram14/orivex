import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';

import type { LogoutAllSessionsCommand } from './logout-all-sessions.command.js';

export type LogoutAllSessionsResult = 'not_found' | 'ok';

// Revokes every active session for the caller's credential in one atomic
// operation (SessionRepository.revokeAllForCredential), including the
// caller's own current session -- the controller is responsible for also
// clearing the caller's own refresh cookie, since their own session is now
// revoked too.
export class LogoutAllSessionsUseCase {
  constructor(
    private readonly credentialRepository: CredentialRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async execute(command: LogoutAllSessionsCommand): Promise<LogoutAllSessionsResult> {
    const credential = await this.credentialRepository.findByAccountId(command.accountId);
    if (!credential) {
      return 'not_found';
    }

    await this.sessionRepository.revokeAllForCredential(credential.getId());
    return 'ok';
  }
}
