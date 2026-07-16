import { NotificationSeverity as PrismaNotificationSeverity } from '@prisma/client';

import { NotificationSeverity } from '../../domain/enums/notification-severity.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake, matching the frontend's real NotificationSeverity contract
// exactly. Same translation-boundary pattern as consultation-type.mapper.ts.
const DOMAIN_TO_PRISMA: Record<NotificationSeverity, PrismaNotificationSeverity> = {
  [NotificationSeverity.Info]: PrismaNotificationSeverity.INFO,
  [NotificationSeverity.Success]: PrismaNotificationSeverity.SUCCESS,
  [NotificationSeverity.Warning]: PrismaNotificationSeverity.WARNING,
  [NotificationSeverity.Danger]: PrismaNotificationSeverity.DANGER,
};

const PRISMA_TO_DOMAIN: Record<PrismaNotificationSeverity, NotificationSeverity> = {
  [PrismaNotificationSeverity.INFO]: NotificationSeverity.Info,
  [PrismaNotificationSeverity.SUCCESS]: NotificationSeverity.Success,
  [PrismaNotificationSeverity.WARNING]: NotificationSeverity.Warning,
  [PrismaNotificationSeverity.DANGER]: NotificationSeverity.Danger,
};

export function toPrismaNotificationSeverity(value: NotificationSeverity): PrismaNotificationSeverity {
  return DOMAIN_TO_PRISMA[value];
}

export function toDomainNotificationSeverity(value: PrismaNotificationSeverity): NotificationSeverity {
  return PRISMA_TO_DOMAIN[value];
}
