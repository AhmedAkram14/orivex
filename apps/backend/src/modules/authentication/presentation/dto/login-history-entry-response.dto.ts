import type { SecurityEvent } from '../../../trust/domain/entities/security-event.entity.js';
import { SecurityEventType } from '../../../trust/domain/enums/security-event-type.enum.js';

export type LoginHistoryOutcome = 'success' | 'failed' | 'locked';

const EVENT_TYPE_TO_OUTCOME: Partial<Record<SecurityEventType, LoginHistoryOutcome>> = {
  [SecurityEventType.LoginSucceeded]: 'success',
  [SecurityEventType.LoginFailed]: 'failed',
  [SecurityEventType.AccountLocked]: 'locked',
};

// Matches the frontend's honest LoginHistoryEntry contract exactly
// (features/auth/api/types.ts): { id, timestamp, ipAddress?, userAgent?,
// outcome }. Deliberately no location/device split, and no finer-grained
// outcome than SecurityEventType actually gives -- see
// list-login-history-for-account.use-case.ts for the event-type filter this
// DTO assumes has already been applied.
export class LoginHistoryEntryResponseDto {
  id!: string;
  timestamp!: string;
  ipAddress?: string;
  userAgent?: string;
  outcome!: LoginHistoryOutcome;

  static fromDomain(event: SecurityEvent): LoginHistoryEntryResponseDto {
    const outcome = EVENT_TYPE_TO_OUTCOME[event.getEventType()];
    if (!outcome) {
      // Should not happen: the use case already filters to login-relevant
      // types only. Surfaced loudly rather than silently mislabeling an
      // event, in case that filter is ever loosened without updating this map.
      throw new Error(`Unmappable login-history event type: ${event.getEventType()}`);
    }

    const dto = new LoginHistoryEntryResponseDto();
    dto.id = event.getId();
    dto.timestamp = event.getDetectedAt().toISOString();
    dto.ipAddress = event.getIpAddress();
    dto.userAgent = event.getUserAgent();
    dto.outcome = outcome;
    return dto;
  }
}
