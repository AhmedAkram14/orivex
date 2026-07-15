import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import type { LogoutCommand } from './logout.command.js';

// Idempotent by design: no cookie, no matching session, or an already-
// revoked session are all treated as "already logged out", never an error —
// mirrors AUTH_ERROR_CODES having no "not logged in" failure mode for logout.
export class LogoutUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    if (!command.refreshToken) {
      return;
    }

    const hash = TokenHash.create(this.tokenGenerator.hash(command.refreshToken));
    const session = await this.sessionRepository.findByRefreshTokenHash(hash);
    if (!session) {
      return;
    }

    session.revoke();
    await this.sessionRepository.save(session);
    await this.eventDispatcher.dispatch(session.releaseDomainEvents());
  }
}
