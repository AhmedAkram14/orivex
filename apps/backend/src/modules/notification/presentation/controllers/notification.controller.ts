import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { ListNotificationsForAccountUseCase } from '../../application/use-cases/list-notifications-for-account/list-notifications-for-account.use-case.js';
import { MarkAllNotificationsReadCommand } from '../../application/use-cases/mark-all-notifications-read/mark-all-notifications-read.command.js';
import { MarkAllNotificationsReadUseCase } from '../../application/use-cases/mark-all-notifications-read/mark-all-notifications-read.use-case.js';
import { MarkNotificationReadCommand } from '../../application/use-cases/mark-notification-read/mark-notification-read.command.js';
import { MarkNotificationReadUseCase } from '../../application/use-cases/mark-notification-read/mark-notification-read.use-case.js';
import { NotificationResponseDto } from '../dto/notification-response.dto.js';

// Matches the frontend's real NOTIFICATIONS_PATHS exactly (features/
// notifications/api/paths.ts): GET /notifications, POST /notifications/:id/
// read, POST /notifications/read-all. Deliberately no @Roles() restriction --
// any authenticated account (patient or doctor) reads/marks only its own
// notifications, scoped via the JWT, never a role. No producer wiring across
// other modules exists yet (docs/05-information-architecture.md's "consumes
// nearly every event in the system" is future work) -- this is the honest
// delivery/query/mark-read surface only, so the list is empty until that
// infrastructure lands.
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly listNotificationsForAccountUseCase: ListNotificationsForAccountUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
    private readonly markAllNotificationsReadUseCase: MarkAllNotificationsReadUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() user: AccessTokenClaims): Promise<ResponseEnvelope<NotificationResponseDto[]>> {
    const notifications = await this.listNotificationsForAccountUseCase.execute({ accountId: user.accountId });
    return envelope(notifications.map((notification) => NotificationResponseDto.fromDomain(notification)));
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<NotificationResponseDto>> {
    const notification = await this.markNotificationReadUseCase.execute(
      new MarkNotificationReadCommand({ notificationId: id, accountId: user.accountId }),
    );
    if (!notification) {
      throw new NotFoundError(`Notification "${id}" not found.`);
    }
    return envelope(NotificationResponseDto.fromDomain(notification));
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@CurrentUser() user: AccessTokenClaims): Promise<ResponseEnvelope<NotificationResponseDto[]>> {
    const notifications = await this.markAllNotificationsReadUseCase.execute(
      new MarkAllNotificationsReadCommand({ accountId: user.accountId }),
    );
    return envelope(notifications.map((notification) => NotificationResponseDto.fromDomain(notification)));
  }
}
