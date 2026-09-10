import type { Message as PrismaMessage } from '@prisma/client';

import { Message } from '../../domain/entities/message.entity.js';

export function toDomainMessage(row: PrismaMessage): Message {
  return Message.reconstitute({
    id: row.id,
    threadId: row.threadId,
    senderAccountId: row.senderAccountId,
    body: row.body,
    attachmentAssetId: row.attachmentAssetId ?? undefined,
    readAt: row.readAt ?? undefined,
    createdAt: row.createdAt,
  });
}
