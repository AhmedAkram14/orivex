import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { MessageThread } from '../../domain/entities/message-thread.entity.js';
import { MessageThreadConflictError } from '../../domain/exceptions/message-thread-conflict.error.js';
import type { MessageThreadRepository } from '../../domain/repositories/message-thread.repository.js';

import { toDomainMessageThread } from './message-thread.mapper.js';

function isPatientDoctorConflict(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

@Injectable()
export class PrismaMessageThreadRepository implements MessageThreadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<MessageThread | null> {
    const row = await this.prisma.messageThread.findUnique({ where: { id } });
    return row ? toDomainMessageThread(row) : null;
  }

  async findByPatientAndDoctor(patientId: string, doctorId: string): Promise<MessageThread | null> {
    const row = await this.prisma.messageThread.findUnique({
      where: { patientId_doctorId: { patientId, doctorId } },
    });
    return row ? toDomainMessageThread(row) : null;
  }

  async findByPatientId(patientId: string): Promise<MessageThread[]> {
    const rows = await this.prisma.messageThread.findMany({ where: { patientId }, orderBy: { lastMessageAt: 'desc' } });
    return rows.map(toDomainMessageThread);
  }

  async findByDoctorId(doctorId: string): Promise<MessageThread[]> {
    const rows = await this.prisma.messageThread.findMany({ where: { doctorId }, orderBy: { lastMessageAt: 'desc' } });
    return rows.map(toDomainMessageThread);
  }

  // Upserts on the compound `patientId_doctorId` unique key -- NOT on `id`.
  // The entity always carries a generated id, so an id-keyed upsert would
  // happily INSERT a second row for a pair that already has a thread and
  // only then hit the `@@unique([patientId, doctorId])` constraint, throwing
  // instead of merging. Keying the upsert on the compound pair makes two
  // concurrent StartOrGetMessageThread calls for the same pair resolve to
  // one row cleanly (the loser's INSERT becomes an UPDATE instead of a
  // conflict) -- see StartOrGetMessageThreadUseCase's P2002 fallback for the
  // remaining race window this alone doesn't close (both callers still miss
  // the initial findByPatientAndDoctor read).
  async save(thread: MessageThread): Promise<void> {
    const data = {
      lastMessageAt: thread.getLastMessageAt(),
      patientLastReadAt: thread.getPatientLastReadAt() ?? null,
      doctorLastReadAt: thread.getDoctorLastReadAt() ?? null,
    };
    try {
      await this.prisma.messageThread.upsert({
        where: { patientId_doctorId: { patientId: thread.getPatientId(), doctorId: thread.getDoctorId() } },
        create: {
          id: thread.getId(),
          patientId: thread.getPatientId(),
          doctorId: thread.getDoctorId(),
          createdAt: thread.getCreatedAt(),
          ...data,
        },
        update: data,
      });
    } catch (error) {
      if (isPatientDoctorConflict(error)) {
        throw new MessageThreadConflictError(thread.getPatientId(), thread.getDoctorId());
      }
      throw error;
    }
  }
}
