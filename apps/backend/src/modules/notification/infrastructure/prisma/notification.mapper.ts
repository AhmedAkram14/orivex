import type { Notification as PrismaNotificationRow } from '@prisma/client';

import { Notification } from '../../domain/entities/notification.entity.js';
import { NotificationEntityType } from '../../domain/enums/notification-entity-type.enum.js';

import { toDomainNotificationSeverity, toPrismaNotificationSeverity } from './notification-severity.mapper.js';

function toDomainEntityType(value: string | null): NotificationEntityType | undefined {
  if (!value) return undefined;
  return Object.values(NotificationEntityType).includes(value as NotificationEntityType)
    ? (value as NotificationEntityType)
    : undefined;
}

export function toDomainNotification(row: PrismaNotificationRow): Notification {
  return Notification.reconstitute({
    id: row.id,
    accountId: row.accountId,
    title: row.title,
    description: row.description,
    severity: toDomainNotificationSeverity(row.severity),
    read: row.read,
    createdAt: row.createdAt,
    actionUrl: row.actionUrl,
    entityType: toDomainEntityType(row.entityType),
    entityId: row.entityId,
  });
}

export function toPersistedNotification(notification: Notification) {
  return {
    id: notification.getId(),
    accountId: notification.getAccountId(),
    title: notification.getTitle(),
    description: notification.getDescription(),
    severity: toPrismaNotificationSeverity(notification.getSeverity()),
    read: notification.isRead(),
    createdAt: notification.getCreatedAt(),
    actionUrl: notification.getActionUrl() ?? null,
    entityType: notification.getEntityType() ?? null,
    entityId: notification.getEntityId() ?? null,
  };
}
