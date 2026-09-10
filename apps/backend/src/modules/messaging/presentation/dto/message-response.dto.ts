import type { Message } from '../../domain/entities/message.entity.js';

export class MessageResponseDto {
  id!: string;
  threadId!: string;
  senderAccountId!: string;
  body!: string;
  attachmentAssetId!: string | null;
  readAt!: string | null;
  createdAt!: string;

  static fromDomain(message: Message): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.id = message.getId();
    dto.threadId = message.getThreadId();
    dto.senderAccountId = message.getSenderAccountId();
    dto.body = message.getBody();
    dto.attachmentAssetId = message.getAttachmentAssetId() ?? null;
    dto.readAt = message.getReadAt()?.toISOString() ?? null;
    dto.createdAt = message.getCreatedAt().toISOString();
    return dto;
  }
}
