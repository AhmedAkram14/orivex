import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { MessageThread } from '../../domain/entities/message-thread.entity.js';
import { GetInboxPreviewsForThreadsUseCase } from '../../application/use-cases/get-inbox-previews-for-threads/get-inbox-previews-for-threads.use-case.js';
import { GetUnreadCountForAccountUseCase } from '../../application/use-cases/get-unread-count-for-account/get-unread-count-for-account.use-case.js';
import { ListAppointmentsForThreadUseCase } from '../../application/use-cases/list-appointments-for-thread/list-appointments-for-thread.use-case.js';
import { ListMessageThreadsForAccountUseCase } from '../../application/use-cases/list-message-threads-for-account/list-message-threads-for-account.use-case.js';
import { ListMessagesForThreadUseCase } from '../../application/use-cases/list-messages-for-thread/list-messages-for-thread.use-case.js';
import { MarkThreadMessagesReadCommand } from '../../application/use-cases/mark-thread-messages-read/mark-thread-messages-read.command.js';
import { MarkThreadMessagesReadUseCase } from '../../application/use-cases/mark-thread-messages-read/mark-thread-messages-read.use-case.js';
import { SendMessageCommand } from '../../application/use-cases/send-message/send-message.command.js';
import { SendMessageUseCase } from '../../application/use-cases/send-message/send-message.use-case.js';
import { StartOrGetMessageThreadCommand } from '../../application/use-cases/start-or-get-message-thread/start-or-get-message-thread.command.js';
import { StartOrGetMessageThreadUseCase } from '../../application/use-cases/start-or-get-message-thread/start-or-get-message-thread.use-case.js';
import { MessageThreadResponseDto } from '../dto/message-thread-response.dto.js';
import { MessageResponseDto } from '../dto/message-response.dto.js';
import { SendMessageRequestDto } from '../dto/send-message-request.dto.js';
import { StartMessageThreadRequestDto } from '../dto/start-message-thread-request.dto.js';
import { ThreadAppointmentResponseDto } from '../dto/thread-appointment-response.dto.js';
import { mapMessagingError } from '../mappers/messaging-exception.mapper.js';

// I7 -- Messaging (docs/01-prd.md §2.13): asynchronous, administrative/
// follow-up communication tied to a real patient/doctor relationship --
// explicitly NOT diagnosis-via-chat. Patient and Doctor alike; ownership of
// every thread/message is enforced inside the use cases themselves
// (defense-in-depth), this controller only resolves the caller's own
// account id from their JWT and composes read-only presentation concerns
// (counterpartyDisplayName) the use cases deliberately don't own.
@Controller('message-threads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Patient, AccountRole.Doctor)
export class MessageThreadController {
  constructor(
    private readonly startOrGetMessageThreadUseCase: StartOrGetMessageThreadUseCase,
    private readonly listMessageThreadsForAccountUseCase: ListMessageThreadsForAccountUseCase,
    private readonly listMessagesForThreadUseCase: ListMessagesForThreadUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly markThreadMessagesReadUseCase: MarkThreadMessagesReadUseCase,
    private readonly getUnreadCountForAccountUseCase: GetUnreadCountForAccountUseCase,
    private readonly getInboxPreviewsForThreadsUseCase: GetInboxPreviewsForThreadsUseCase,
    private readonly listAppointmentsForThreadUseCase: ListAppointmentsForThreadUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
  ) {}

  @Get()
  async listMyThreads(@CurrentUser() user: AccessTokenClaims): Promise<ResponseEnvelope<MessageThreadResponseDto[]>> {
    const threads = await this.listMessageThreadsForAccountUseCase.execute({ callerAccountId: user.accountId });
    // Doctor UX audit remediation (Phase 6 backend proposal): one batched
    // call for every thread's preview/unread metadata, not per-row -- see
    // GetInboxPreviewsForThreadsUseCase's own doc comment.
    const previewsByThreadId = await this.getInboxPreviewsForThreadsUseCase.execute(
      threads.map((thread) => thread.getId()),
      user.accountId,
    );
    const dtos = await Promise.all(
      threads.map(async (thread) => {
        const counterparty = await this.resolveCounterpartyInfo(thread, user.accountId);
        const preview = previewsByThreadId.get(thread.getId());
        return MessageThreadResponseDto.fromDomain(thread, {
          ...counterparty,
          lastMessagePreview: preview?.lastMessagePreview,
          unreadCount: preview?.unreadCount,
        });
      }),
    );
    return envelope(dtos);
  }

  // Re-threading (Phase 1): a single account-wide join query
  // (GetUnreadCountForAccountUseCase -> MessageRepository.countUnreadForAccount),
  // never a per-thread loop -- backs the sidebar's unread badge (Phase 3).
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: AccessTokenClaims): Promise<ResponseEnvelope<{ count: number }>> {
    const count = await this.getUnreadCountForAccountUseCase.execute({ callerAccountId: user.accountId });
    return envelope({ count });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async startOrGetThread(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: StartMessageThreadRequestDto,
  ): Promise<ResponseEnvelope<MessageThreadResponseDto>> {
    try {
      const thread = await this.startOrGetMessageThreadUseCase.execute(
        new StartOrGetMessageThreadCommand({ counterpartyProfileId: body.counterpartyProfileId, callerAccountId: user.accountId }),
      );
      const counterparty = await this.resolveCounterpartyInfo(thread, user.accountId);
      return envelope(MessageThreadResponseDto.fromDomain(thread, counterparty));
    } catch (error) {
      throw mapMessagingError(error);
    }
  }

  @Get(':id/messages')
  async listMessages(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<MessageResponseDto[]>> {
    try {
      const messages = await this.listMessagesForThreadUseCase.execute({ threadId: id, callerAccountId: user.accountId });
      return envelope(messages.map((message) => MessageResponseDto.fromDomain(message)));
    } catch (error) {
      throw mapMessagingError(error);
    }
  }

  // Added ahead of Phase 5's actual UI consumption since the underlying
  // GetAppointmentsForDoctorAndPatientUseCase this wraps already exists --
  // the thread-header "last appointment" context a later phase renders.
  @Get(':id/appointments')
  async listAppointments(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<ThreadAppointmentResponseDto[]>> {
    try {
      const appointments = await this.listAppointmentsForThreadUseCase.execute({ threadId: id, callerAccountId: user.accountId });
      return envelope(appointments.map((appointment) => ThreadAppointmentResponseDto.fromDomain(appointment)));
    } catch (error) {
      throw mapMessagingError(error);
    }
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SendMessageRequestDto,
  ): Promise<ResponseEnvelope<MessageResponseDto>> {
    try {
      const message = await this.sendMessageUseCase.execute(
        new SendMessageCommand({
          threadId: id,
          senderAccountId: user.accountId,
          body: body.body,
          attachmentAssetId: body.attachmentAssetId,
        }),
      );
      return envelope(MessageResponseDto.fromDomain(message));
    } catch (error) {
      throw mapMessagingError(error);
    }
  }

  @Patch(':id/read')
  async markRead(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<{ acknowledged: true }>> {
    try {
      await this.markThreadMessagesReadUseCase.execute(
        new MarkThreadMessagesReadCommand({ threadId: id, callerAccountId: user.accountId }),
      );
      return envelope({ acknowledged: true as const });
    } catch (error) {
      throw mapMessagingError(error);
    }
  }

  // Decision 3 of the Messages Page Overhaul plan: resolved server-side,
  // eliminating the previous fragile client-side id-matching against the
  // caller's own appointments list entirely. Both fields undefined (never
  // fabricated) if the counterparty's own profile/account lookup somehow
  // fails. `counterpartyAccountId` (Phase 2) is what the frontend targets a
  // `messaging.typing` emit at -- see MessageThreadResponseDto's own comment.
  private async resolveCounterpartyInfo(
    thread: MessageThread,
    callerAccountId: string,
  ): Promise<{ counterpartyDisplayName?: string; counterpartyAccountId?: string; counterpartyAvatarUrl?: string }> {
    const patientProfile = await this.getPatientProfileByIdUseCase.execute({ patientProfileId: thread.getPatientId() });
    const callerIsPatient = patientProfile?.getAccountId() === callerAccountId;

    const counterpartyAccountId = callerIsPatient
      ? (await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: thread.getDoctorId() }))?.getAccountId()
      : patientProfile?.getAccountId();

    if (!counterpartyAccountId) {
      return {};
    }
    const counterpartyAccount = await this.getAccountByIdUseCase.execute({ accountId: counterpartyAccountId });
    return {
      counterpartyAccountId,
      counterpartyDisplayName: counterpartyAccount?.getUserProfile().getDisplayName().toString(),
      counterpartyAvatarUrl: counterpartyAccount?.getUserProfile().getAvatarUrl(),
    };
  }
}
