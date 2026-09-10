import type { AuditLog } from '../../../trust/domain/entities/audit-log.entity.js';
import type { AuditAction } from '../../../trust/domain/enums/audit-action.enum.js';

export class AuditLogEntryResponseDto {
  id!: string;
  actorAccountId!: string;
  actorRole!: string;
  action!: AuditAction;
  subjectType!: string;
  subjectId!: string;
  reason!: string | null;
  metadata!: Record<string, unknown>;
  createdAt!: string;

  static fromDomain(entry: AuditLog): AuditLogEntryResponseDto {
    const dto = new AuditLogEntryResponseDto();
    dto.id = entry.getId();
    dto.actorAccountId = entry.getActorAccountId();
    dto.actorRole = entry.getActorRole();
    dto.action = entry.getAction();
    dto.subjectType = entry.getSubjectType();
    dto.subjectId = entry.getSubjectId();
    dto.reason = entry.getReason() ?? null;
    dto.metadata = entry.getMetadata();
    dto.createdAt = entry.getCreatedAt().toISOString();
    return dto;
  }
}
