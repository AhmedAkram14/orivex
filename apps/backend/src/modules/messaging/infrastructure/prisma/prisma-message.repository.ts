import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { Message } from '../../domain/entities/message.entity.js';
import type { MessageThread } from '../../domain/entities/message-thread.entity.js';
import type { MessageRepository, MessagingParticipantRole } from '../../domain/repositories/message.repository.js';

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

  // Re-threading (Phase 1): one join query, not "list thread ids then count
  // across them" -- that shape forces the badge endpoint to first list every
  // thread just to get ids to count, which is one query pretending to save
  // one query. Joins Message -> MessageThread -> (PatientProfile|
  // DoctorProfile) to resolve which threads this *account* is a party to on
  // the given side, without the application layer needing to resolve the
  // profile id itself first.
  async countUnreadForAccount(accountId: string, role: MessagingParticipantRole): Promise<number> {
    const rows =
      role === 'patient'
        ? await this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
            SELECT COUNT(*)::bigint AS count
            FROM "Message" m
            JOIN "MessageThread" t ON t.id = m."threadId"
            JOIN "PatientProfile" p ON p.id = t."patientId"
            WHERE p."accountId" = ${accountId}
              AND m."senderAccountId" != ${accountId}
              AND m."createdAt" > COALESCE(t."patientLastReadAt", '-infinity'::timestamp)
          `)
        : await this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
            SELECT COUNT(*)::bigint AS count
            FROM "Message" m
            JOIN "MessageThread" t ON t.id = m."threadId"
            JOIN "DoctorProfile" d ON d.id = t."doctorId"
            WHERE d."accountId" = ${accountId}
              AND m."senderAccountId" != ${accountId}
              AND m."createdAt" > COALESCE(t."doctorLastReadAt", '-infinity'::timestamp)
          `);
    return Number(rows[0]?.count ?? 0n);
  }

  // Doctor UX audit remediation (Phase 6 backend proposal): DISTINCT ON is
  // Postgres-specific, matching countUnreadForAccount's own precedent of
  // reaching for raw SQL when Prisma's query builder has no "latest row per
  // group" shape (groupBy only aggregates, it can't return the winning
  // row's other columns). Empty threadIds short-circuits to avoid issuing
  // `= ANY('{}')` against an empty array, which Postgres accepts but is
  // pointless to send.
  async findLatestMessagesForThreads(threadIds: string[]): Promise<Map<string, Message>> {
    if (threadIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<
      { id: string; threadId: string; senderAccountId: string; body: string; attachmentAssetId: string | null; readAt: Date | null; createdAt: Date }[]
    >(Prisma.sql`
      SELECT DISTINCT ON (m."threadId") m.id, m."threadId", m."senderAccountId", m.body, m."attachmentAssetId", m."readAt", m."createdAt"
      FROM "Message" m
      WHERE m."threadId" = ANY(${threadIds})
      ORDER BY m."threadId", m."createdAt" DESC
    `);
    return new Map(rows.map((row) => [row.threadId, toDomainMessage(row)]));
  }

  // Same batching discipline as findLatestMessagesForThreads above --
  // Prisma's groupBy covers this one natively (a plain count aggregate),
  // no raw SQL needed.
  async countUnreadForThreads(threadIds: string[], recipientAccountId: string): Promise<Map<string, number>> {
    if (threadIds.length === 0) return new Map();
    const rows = await this.prisma.message.groupBy({
      by: ['threadId'],
      where: { threadId: { in: threadIds }, senderAccountId: { not: recipientAccountId }, readAt: null },
      _count: true,
    });
    return new Map(rows.map((row) => [row.threadId, row._count]));
  }

  async save(message: Message): Promise<void> {
    await this.upsert(message);
  }

  async saveAll(messages: Message[]): Promise<void> {
    await Promise.all(messages.map((message) => this.upsert(message)));
  }

  // See the interface doc-comment: Message.readAt and the thread's own
  // *LastReadAt are written in a single Prisma $transaction (mirrors
  // PrismaConsultationSessionRepository's own multi-model transaction
  // precedent) -- never as two independent calls that could partially
  // apply.
  async saveAllAndMarkThreadRead(messages: Message[], thread: MessageThread): Promise<void> {
    const messageWrites = messages.map((message) => {
      const data = {
        threadId: message.getThreadId(),
        senderAccountId: message.getSenderAccountId(),
        body: message.getBody(),
        attachmentAssetId: message.getAttachmentAssetId() ?? null,
        readAt: message.getReadAt() ?? null,
        createdAt: message.getCreatedAt(),
      };
      return this.prisma.message.upsert({
        where: { id: message.getId() },
        create: { id: message.getId(), ...data },
        update: data,
      });
    });
    const threadWrite = this.prisma.messageThread.update({
      where: { patientId_doctorId: { patientId: thread.getPatientId(), doctorId: thread.getDoctorId() } },
      data: {
        patientLastReadAt: thread.getPatientLastReadAt() ?? null,
        doctorLastReadAt: thread.getDoctorLastReadAt() ?? null,
      },
    });
    await this.prisma.$transaction([...messageWrites, threadWrite]);
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
