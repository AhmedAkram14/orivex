import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { ListMessageThreadsForAccountUseCase } from '../../application/use-cases/list-message-threads-for-account/list-message-threads-for-account.use-case.js';
import { ListMessagesForThreadUseCase } from '../../application/use-cases/list-messages-for-thread/list-messages-for-thread.use-case.js';
import { MarkThreadMessagesReadCommand } from '../../application/use-cases/mark-thread-messages-read/mark-thread-messages-read.command.js';
import { MarkThreadMessagesReadUseCase } from '../../application/use-cases/mark-thread-messages-read/mark-thread-messages-read.use-case.js';
import { SendMessageCommand } from '../../application/use-cases/send-message/send-message.command.js';
import { SendMessageUseCase } from '../../application/use-cases/send-message/send-message.use-case.js';
import { StartOrGetMessageThreadCommand } from '../../application/use-cases/start-or-get-message-thread/start-or-get-message-thread.command.js';
import { StartOrGetMessageThreadUseCase } from '../../application/use-cases/start-or-get-message-thread/start-or-get-message-thread.use-case.js';
import type { MessageRepository } from '../../domain/repositories/message.repository.js';
import { MessageThreadResponseDto } from '../dto/message-thread-response.dto.js';
import { MessageResponseDto } from '../dto/message-response.dto.js';
import { SendMessageRequestDto } from '../dto/send-message-request.dto.js';
import { StartMessageThreadRequestDto } from '../dto/start-message-thread-request.dto.js';
import { mapMessagingError } from '../mappers/messaging-exception.mapper.js';
import { MESSAGE_REPOSITORY } from '../../application/ports/tokens.js';

// I7 -- Messaging (docs/01-prd.md §2.13): asynchronous, administrative/
// follow-up communication tied to a booking -- explicitly NOT diagnosis-
// via-chat (L112). Patient and Doctor alike; ownership of every thread/
// message is enforced inside the use cases themselves (defense-in-depth),
// this controller only resolves the caller's own account id from their JWT.
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
    @Inject(MESSAGE_REPOSITORY) private readonly messageRepository: MessageRepository,
  ) {}

  @Get()
  async listMyThreads(@CurrentUser() user: AccessTokenClaims): Promise<ResponseEnvelope<MessageThreadResponseDto[]>> {
    const threads = await this.listMessageThreadsForAccountUseCase.execute({ callerAccountId: user.accountId });
    const dtos = await Promise.all(
      threads.map(async (thread) => {
        const unreadCount = await this.messageRepository.countUnreadForRecipient(thread.getId(), user.accountId);
        return MessageThreadResponseDto.fromDomain(thread, unreadCount);
      }),
    );
    return envelope(dtos);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async startOrGetThread(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: StartMessageThreadRequestDto,
  ): Promise<ResponseEnvelope<MessageThreadResponseDto>> {
    try {
      const thread = await this.startOrGetMessageThreadUseCase.execute(
        new StartOrGetMessageThreadCommand({ appointmentId: body.appointmentId, callerAccountId: user.accountId }),
      );
      return envelope(MessageThreadResponseDto.fromDomain(thread));
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
}
