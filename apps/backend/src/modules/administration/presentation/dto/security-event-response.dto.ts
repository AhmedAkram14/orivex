import type { SecurityEvent } from '../../../trust/domain/entities/security-event.entity.js';
import type { SecurityEventStatus } from '../../../trust/domain/enums/security-event-status.enum.js';
import type { SecurityEventType } from '../../../trust/domain/enums/security-event-type.enum.js';

// The admin audit-log's full-detail view of a SecurityEvent -- distinct
// from AuthenticationModule's LoginHistoryEntryResponseDto, which narrows to
// login-relevant event types only and a simplified outcome. This DTO
// surfaces every event type/status/metadata field an admin auditing the
// platform needs to see.
export class SecurityEventResponseDto {
  id!: string;
  accountId!: string;
  eventType!: SecurityEventType;
  status!: SecurityEventStatus;
  ipAddress?: string;
  userAgent?: string;
  metadata!: Record<string, unknown>;
  detectedAt!: string;

  static fromDomain(event: SecurityEvent): SecurityEventResponseDto {
    const dto = new SecurityEventResponseDto();
    dto.id = event.getId();
    dto.accountId = event.getAccountId();
    dto.eventType = event.getEventType();
    dto.status = event.getStatus();
    dto.ipAddress = event.getIpAddress();
    dto.userAgent = event.getUserAgent();
    dto.metadata = event.getMetadata();
    dto.detectedAt = event.getDetectedAt().toISOString();
    return dto;
  }
}
