import type { Notification as PrismaNotificationRow } from '@prisma/client';

import { Notification } from '../../domain/entities/notification.entity.js';

import { toDomainNotificationSeverity, toPrismaNotificationSeverity } from './notification-severity.mapper.js';

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
  };
}
