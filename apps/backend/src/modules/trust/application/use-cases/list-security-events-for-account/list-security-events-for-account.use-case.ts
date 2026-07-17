import type { SecurityEvent } from '../../../domain/entities/security-event.entity.js';
import type { SecurityEventRepository } from '../../../domain/repositories/security-event.repository.js';

import type { ListSecurityEventsForAccountQuery } from './list-security-events-for-account.query.js';

// Pure read — mirrors ListNotificationsForAccountUseCase's pattern. Exported
// from TrustModule for AuthenticationController's GET /auth/login-history,
// which filters the full result down to login-relevant event types itself.
export class ListSecurityEventsForAccountUseCase {
  constructor(private readonly securityEventRepository: SecurityEventRepository) {}

  async execute(query: ListSecurityEventsForAccountQuery): Promise<SecurityEvent[]> {
    return this.securityEventRepository.findByAccountId(query.accountId);
  }
}
