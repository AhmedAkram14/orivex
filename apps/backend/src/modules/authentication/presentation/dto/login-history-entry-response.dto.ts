import { parseUserAgent } from '../../../../platform/http/parse-user-agent.js';
import { resolveIpLocation } from '../../../../platform/http/resolve-ip-location.js';
import type { SecurityEvent } from '../../../trust/domain/entities/security-event.entity.js';
import { SecurityEventType } from '../../../trust/domain/enums/security-event-type.enum.js';

export type LoginHistoryOutcome = 'success' | 'failed' | 'locked';

const EVENT_TYPE_TO_OUTCOME: Partial<Record<SecurityEventType, LoginHistoryOutcome>> = {
  [SecurityEventType.LoginSucceeded]: 'success',
  [SecurityEventType.LoginFailed]: 'failed',
  [SecurityEventType.AccountLocked]: 'locked',
};

// Matches the frontend's LoginHistoryEntry contract (features/auth/api/
// types.ts). browser/os/displayName/city/country are enriched here, on
// read, the same way DeviceSessionResponseDto does it -- see that file's
// comment for why this stays a read-time computation, not a stored column.
// No finer-grained outcome than SecurityEventType actually gives -- see
// list-login-history-for-account.use-case.ts for the event-type filter this
// DTO assumes has already been applied.
export class LoginHistoryEntryResponseDto {
  id!: string;
  timestamp!: string;
  ipAddress?: string;
  userAgent?: string;
  outcome!: LoginHistoryOutcome;
  browser?: string;
  os?: string;
  displayName!: string;
  city?: string;
  country?: string;

  static fromDomain(event: SecurityEvent): LoginHistoryEntryResponseDto {
    const outcome = EVENT_TYPE_TO_OUTCOME[event.getEventType()];
    if (!outcome) {
      // Should not happen: the use case already filters to login-relevant
      // types only. Surfaced loudly rather than silently mislabeling an
      // event, in case that filter is ever loosened without updating this map.
      throw new Error(`Unmappable login-history event type: ${event.getEventType()}`);
    }

    const dto = new LoginHistoryEntryResponseDto();
    const ua = parseUserAgent(event.getUserAgent());
    const ip = event.getIpAddress();
    const location = ip ? resolveIpLocation(ip) : null;

    dto.id = event.getId();
    dto.timestamp = event.getDetectedAt().toISOString();
    dto.ipAddress = ip;
    dto.userAgent = event.getUserAgent();
    dto.outcome = outcome;
    dto.browser = ua.browser;
    dto.os = ua.os;
    dto.displayName = ua.displayName;
    dto.city = location?.city;
    dto.country = location?.country;
    return dto;
  }
}
