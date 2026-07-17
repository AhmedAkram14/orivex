import type { SecurityEvent } from '../../../../trust/domain/entities/security-event.entity.js';
import { SecurityEventType } from '../../../../trust/domain/enums/security-event-type.enum.js';
import type { ListSecurityEventsForAccountUseCase } from '../../../../trust/application/use-cases/list-security-events-for-account/list-security-events-for-account.use-case.js';

import type { ListLoginHistoryForAccountQuery } from './list-login-history-for-account.query.js';

// GET /auth/login-history is deliberately login-relevant only, not the full
// audit trail TrustModule's SecurityEvent aggregate captures (e.g. excludes
// PasswordChanged/SessionRevoked/RefreshTokenReuseDetected) -- this is
// AuthenticationModule's own read model built on top of Trust's exported
// ListSecurityEventsForAccountUseCase, module-to-module through a published
// interface only, never Trust's repository directly.
const LOGIN_RELEVANT_EVENT_TYPES: ReadonlySet<SecurityEventType> = new Set([
  SecurityEventType.LoginSucceeded,
  SecurityEventType.LoginFailed,
  SecurityEventType.AccountLocked,
]);

export class ListLoginHistoryForAccountUseCase {
  constructor(private readonly listSecurityEventsForAccountUseCase: ListSecurityEventsForAccountUseCase) {}

  async execute(query: ListLoginHistoryForAccountQuery): Promise<SecurityEvent[]> {
    const events = await this.listSecurityEventsForAccountUseCase.execute({ accountId: query.accountId });
    return events.filter((event) => LOGIN_RELEVANT_EVENT_TYPES.has(event.getEventType()));
  }
}
