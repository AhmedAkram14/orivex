import type { Session } from '../../../domain/entities/session.entity.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import type { ListDeviceSessionsQuery } from './list-device-sessions.query.js';

export interface DeviceSessionListItem {
  session: Session;
  isCurrent: boolean;
}

// Resolves credentialId from the caller's accountId (a JWT carries only the
// account identity, but Session is keyed by credentialId) and lists that
// credential's active sessions, flagging which one -- if any -- matches the
// caller's own current refresh-token cookie.
//
// Returns null (not a thrown error) when no credential exists for the
// account, mirroring GetCurrentSessionUseCase/MarkNotificationReadUseCase's
// pattern -- the controller decides how to surface that as an HTTP error.
export class ListDeviceSessionsUseCase {
  constructor(
    private readonly credentialRepository: CredentialRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly tokenGenerator: TokenGeneratorPort,
  ) {}

  async execute(query: ListDeviceSessionsQuery): Promise<DeviceSessionListItem[] | null> {
    const credential = await this.credentialRepository.findByAccountId(query.accountId);
    if (!credential) {
      return null;
    }

    const sessions = await this.sessionRepository.findAllActiveForCredential(credential.getId());
    const currentHash = query.currentRefreshToken
      ? TokenHash.create(this.tokenGenerator.hash(query.currentRefreshToken))
      : undefined;

    return sessions.map((session) => ({
      session,
      isCurrent: currentHash !== undefined && session.matchesRefreshTokenHash(currentHash),
    }));
  }
}
