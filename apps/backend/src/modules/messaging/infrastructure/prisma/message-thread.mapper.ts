import type { MessageThread as PrismaMessageThread } from '@prisma/client';

import { MessageThread } from '../../domain/entities/message-thread.entity.js';

export function toDomainMessageThread(row: PrismaMessageThread): MessageThread {
  return MessageThread.reconstitute({
    id: row.id,
    patientId: row.patientId,
    doctorId: row.doctorId,
    createdAt: row.createdAt,
    lastMessageAt: row.lastMessageAt,
    patientLastReadAt: row.patientLastReadAt ?? undefined,
    doctorLastReadAt: row.doctorLastReadAt ?? undefined,
  });
}
