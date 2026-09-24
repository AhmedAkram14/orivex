import type { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationSeverity } from '../../domain/enums/notification-severity.enum.js';
import type { NotificationEntityType } from '../../domain/enums/notification-entity-type.enum.js';

// Matches the frontend's real NotificationEntry contract exactly
// (features/notifications/api/types.ts).
export class NotificationResponseDto {
  id!: string;
  title!: string;
  description!: string;
  severity!: NotificationSeverity;
  createdAt!: string;
  read!: boolean;
  actionUrl?: string;
  /** Doctor UX audit remediation (Phase 5 backend proposal): see Notification entity's own doc comment. Both set or both undefined. */
  entityType?: NotificationEntityType;
  entityId?: string;

  static fromDomain(notification: Notification): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = notification.getId();
    dto.title = notification.getTitle();
    dto.description = notification.getDescription();
    dto.severity = notification.getSeverity();
    dto.createdAt = notification.getCreatedAt().toISOString();
    dto.read = notification.isRead();
    dto.actionUrl = notification.getActionUrl();
    dto.entityType = notification.getEntityType();
    dto.entityId = notification.getEntityId();
    return dto;
  }
}
