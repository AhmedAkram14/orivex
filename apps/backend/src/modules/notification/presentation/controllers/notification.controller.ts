import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { PaginationQueryDto } from '../../../../shared/http/pagination-query.dto.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { GetNotificationPreferencesUseCase } from '../../application/use-cases/get-notification-preferences/get-notification-preferences.use-case.js';
import { ListNotificationsForAccountUseCase } from '../../application/use-cases/list-notifications-for-account/list-notifications-for-account.use-case.js';
import { MarkAllNotificationsReadCommand } from '../../application/use-cases/mark-all-notifications-read/mark-all-notifications-read.command.js';
import { MarkAllNotificationsReadUseCase } from '../../application/use-cases/mark-all-notifications-read/mark-all-notifications-read.use-case.js';
import { MarkNotificationReadCommand } from '../../application/use-cases/mark-notification-read/mark-notification-read.command.js';
import { MarkNotificationReadUseCase } from '../../application/use-cases/mark-notification-read/mark-notification-read.use-case.js';
import { UpdateNotificationPreferencesCommand } from '../../application/use-cases/update-notification-preferences/update-notification-preferences.command.js';
import { UpdateNotificationPreferencesUseCase } from '../../application/use-cases/update-notification-preferences/update-notification-preferences.use-case.js';
import { NotificationPreferencesResponseDto } from '../dto/notification-preferences-response.dto.js';
import { NotificationResponseDto } from '../dto/notification-response.dto.js';
import { UpdateNotificationPreferencesRequestDto } from '../dto/update-notification-preferences-request.dto.js';

// Matches the frontend's real NOTIFICATIONS_PATHS exactly (features/
// notifications/api/paths.ts): GET /notifications, POST /notifications/:id/
// read, POST /notifications/read-all. Deliberately no @Roles() restriction --
// any authenticated account (patient or doctor) reads/marks only its own
// notifications, scoped via the JWT, never a role. This is the in-app
// delivery/query/mark-read surface only -- producer wiring lives entirely in
// notification.module.ts's own domain-event handlers (~20 of them, covering
// booking/cancellation/prescription/verification/consultation lifecycle
// events, several of which also email via I3's EMAIL_SENDER port), not here.
//
// GET/PATCH /notifications/preferences (Doctor Settings Rebuild, Phase 2)
// live on this same controller rather than a new dedicated one: this module
// has established exactly one controller for its entire self-scoped surface
// (list/read/read-all above), and preferences is one more account-scoped
// sub-resource under the same '/notifications' prefix, not a separate
// aggregate with its own lifecycle. Both routes are self-scoped to
// user.accountId only, mirroring PATCH /accounts/me's own never-accept-a-
// target-id convention -- no accountId is ever read from the body/params.
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly listNotificationsForAccountUseCase: ListNotificationsForAccountUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
    private readonly markAllNotificationsReadUseCase: MarkAllNotificationsReadUseCase,
    private readonly getNotificationPreferencesUseCase: GetNotificationPreferencesUseCase,
    private readonly updateNotificationPreferencesUseCase: UpdateNotificationPreferencesUseCase,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AccessTokenClaims,
    @Query() query: PaginationQueryDto,
  ): Promise<ResponseEnvelope<NotificationResponseDto[]>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const { items, total } = await this.listNotificationsForAccountUseCase.execute({
      accountId: user.accountId,
      page,
      limit,
    });
    return envelope(
      items.map((notification) => NotificationResponseDto.fromDomain(notification)),
      { page, limit, total },
    );
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

  @Get('preferences')
  async getPreferences(@CurrentUser() user: AccessTokenClaims): Promise<ResponseEnvelope<NotificationPreferencesResponseDto>> {
    const preference = await this.getNotificationPreferencesUseCase.execute({ accountId: user.accountId });
    return envelope(NotificationPreferencesResponseDto.fromDomain(preference));
  }

  @Patch('preferences')
  async updatePreferences(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: UpdateNotificationPreferencesRequestDto,
  ): Promise<ResponseEnvelope<NotificationPreferencesResponseDto>> {
    const preference = await this.updateNotificationPreferencesUseCase.execute(
      new UpdateNotificationPreferencesCommand({
        accountId: user.accountId,
        emailAppointments: body.emailAppointments,
        emailBilling: body.emailBilling,
        inAppAppointments: body.inAppAppointments,
        inAppBilling: body.inAppBilling,
        emailNewDeviceLogin: body.emailNewDeviceLogin,
      }),
    );
    return envelope(NotificationPreferencesResponseDto.fromDomain(preference));
  }
}
