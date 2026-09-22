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

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export interface ListLoginHistoryForAccountResult {
  items: SecurityEvent[];
  total: number;
  page: number;
  pageCount: number;
}

export class ListLoginHistoryForAccountUseCase {
  constructor(private readonly listSecurityEventsForAccountUseCase: ListSecurityEventsForAccountUseCase) {}

  // Filters/paginates in-memory over the full per-account event list rather
  // than pushing this down to SecurityEventRepository -- a single account's
  // lifetime login-history volume doesn't warrant a DB-level cursor/offset
  // query yet, and keeping this scoped to AuthenticationModule's own read
  // model avoids widening Trust's repository interface for one caller.
  async execute(query: ListLoginHistoryForAccountQuery): Promise<ListLoginHistoryForAccountResult> {
    const events = await this.listSecurityEventsForAccountUseCase.execute({ accountId: query.accountId });
    const loginRelevant = events.filter((event) => LOGIN_RELEVANT_EVENT_TYPES.has(event.getEventType()));

    const filtered = loginRelevant.filter((event) => {
      const detectedAt = event.getDetectedAt();
      if (query.from && detectedAt < query.from) {
        return false;
      }
      if (query.to && detectedAt > query.to) {
        return false;
      }
      if (query.outcome === 'success') {
        return event.getEventType() === SecurityEventType.LoginSucceeded;
      }
      if (query.outcome === 'failed') {
        return event.getEventType() !== SecurityEventType.LoginSucceeded;
      }
      return true;
    });

    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const total = filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, total, page, pageCount };
  }
}
