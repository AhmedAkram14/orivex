import { Module } from '@nestjs/common';

import { AuthenticationModule } from '../authentication/authentication.module.js';

import { NOTIFICATION_REPOSITORY } from './application/ports/tokens.js';
import { ListNotificationsForAccountUseCase } from './application/use-cases/list-notifications-for-account/list-notifications-for-account.use-case.js';
import { MarkAllNotificationsReadUseCase } from './application/use-cases/mark-all-notifications-read/mark-all-notifications-read.use-case.js';
import { MarkNotificationReadUseCase } from './application/use-cases/mark-notification-read/mark-notification-read.use-case.js';
import type { NotificationRepository } from './domain/repositories/notification.repository.js';
import { PrismaNotificationRepository } from './infrastructure/prisma/prisma-notification.repository.js';
import { NotificationController } from './presentation/controllers/notification.controller.js';

// Depends on nothing business-specific -- mirrors AssetModule's posture
// (docs/05-information-architecture.md: "Notifications Domain... a pure
// consumer/router"). Imports AuthenticationModule only for JwtAuthGuard/
// @CurrentUser(), same pattern every other route-protecting module uses.
@Module({
  imports: [AuthenticationModule],
  controllers: [NotificationController],
  providers: [
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
    {
      provide: ListNotificationsForAccountUseCase,
      useFactory: (repository: NotificationRepository) => new ListNotificationsForAccountUseCase(repository),
      inject: [NOTIFICATION_REPOSITORY],
    },
    {
      provide: MarkNotificationReadUseCase,
      useFactory: (repository: NotificationRepository) => new MarkNotificationReadUseCase(repository),
      inject: [NOTIFICATION_REPOSITORY],
    },
    {
      provide: MarkAllNotificationsReadUseCase,
      useFactory: (repository: NotificationRepository) => new MarkAllNotificationsReadUseCase(repository),
      inject: [NOTIFICATION_REPOSITORY],
    },
  ],
  exports: [ListNotificationsForAccountUseCase, MarkNotificationReadUseCase, MarkAllNotificationsReadUseCase],
})
export class NotificationModule {}
