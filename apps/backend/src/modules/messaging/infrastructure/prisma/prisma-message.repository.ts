import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { Message } from '../../domain/entities/message.entity.js';
import type { MessageRepository } from '../../domain/repositories/message.repository.js';

import { toDomainMessage } from './message.mapper.js';

@Injectable()
export class PrismaMessageRepository implements MessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Message | null> {
    const row = await this.prisma.message.findUnique({ where: { id } });
    return row ? toDomainMessage(row) : null;
  }

  async findByThreadId(threadId: string): Promise<Message[]> {
    const rows = await this.prisma.message.findMany({ where: { threadId }, orderBy: { createdAt: 'asc' } });
    return rows.map(toDomainMessage);
  }

  async countUnreadForRecipient(threadId: string, recipientAccountId: string): Promise<number> {
    return this.prisma.message.count({
      where: { threadId, senderAccountId: { not: recipientAccountId }, readAt: null },
    });
  }

  async save(message: Message): Promise<void> {
    await this.upsert(message);
  }

  async saveAll(messages: Message[]): Promise<void> {
    await Promise.all(messages.map((message) => this.upsert(message)));
  }

  private async upsert(message: Message): Promise<void> {
    const data = {
      threadId: message.getThreadId(),
      senderAccountId: message.getSenderAccountId(),
      body: message.getBody(),
      attachmentAssetId: message.getAttachmentAssetId() ?? null,
      readAt: message.getReadAt() ?? null,
      createdAt: message.getCreatedAt(),
    };
    await this.prisma.message.upsert({
      where: { id: message.getId() },
      create: { id: message.getId(), ...data },
      update: data,
    });
  }
}
