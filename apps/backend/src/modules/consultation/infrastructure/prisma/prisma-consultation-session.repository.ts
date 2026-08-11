import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { ConsultationSession } from '../../domain/entities/consultation-session.entity.js';
import { ConsultationDomainError } from '../../domain/exceptions/consultation-domain.error.js';
import type { ConsultationSessionRepository } from '../../domain/repositories/consultation-session.repository.js';

import { toPrismaConsultationCompletionReason } from './consultation-completion-reason.mapper.js';
import { toDomainConsultationSession } from './consultation-session.mapper.js';
import { toPrismaConsultationState } from './consultation-state.mapper.js';

const OPEN_STATES = ['WAITING_ROOM', 'IN_PROGRESS'] as const;

const INCLUDE_CONNECTION_LOGS = { connectionLogs: true } as const;

@Injectable()
export class PrismaConsultationSessionRepository implements ConsultationSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ConsultationSession | null> {
    const row = await this.prisma.consultationSession.findUnique({ where: { id }, include: INCLUDE_CONNECTION_LOGS });
    return row ? toDomainConsultationSession(row) : null;
  }

  async findByAppointmentId(appointmentId: string): Promise<ConsultationSession | null> {
    const row = await this.prisma.consultationSession.findUnique({
      where: { appointmentId },
      include: INCLUDE_CONNECTION_LOGS,
    });
    return row ? toDomainConsultationSession(row) : null;
  }

  async findStale(updatedBefore: Date): Promise<ConsultationSession[]> {
    const rows = await this.prisma.consultationSession.findMany({
      where: { state: { in: [...OPEN_STATES] }, updatedAt: { lt: updatedBefore } },
      include: INCLUDE_CONNECTION_LOGS,
    });
    return rows.map((row) => toDomainConsultationSession(row));
  }

  // Optimistic locking on the session row, mirroring AvailabilityWindow's
  // repository. Connection logs are wholesale-replaced on save, matching
  // Doctor's PortfolioPublication/Award precedent -- no per-item update use
  // case exists this sprint.
  async save(session: ConsultationSession): Promise<void> {
    const id = session.getId();
    const data = {
      state: toPrismaConsultationState(session.getState()),
      completionReason: session.getCompletionReason()
        ? toPrismaConsultationCompletionReason(session.getCompletionReason()!)
        : null,
      startedAt: session.getStartedAt() ?? null,
      closedAt: session.getClosedAt() ?? null,
    };

    const existing = await this.prisma.consultationSession.findUnique({ where: { id }, select: { id: true } });

    if (!existing) {
      await this.prisma.$transaction([
        this.prisma.consultationSession.create({
          data: { id, appointmentId: session.getAppointmentId(), ...data, version: session.getVersion() },
        }),
        this.prisma.sessionConnectionLog.createMany({
          data: session.getConnectionLogs().map((log) => ({
            id: log.getId(),
            consultationSessionId: id,
            note: log.getNote(),
            occurredAt: log.getOccurredAt(),
          })),
        }),
      ]);
      return;
    }

    const [updateResult] = await this.prisma.$transaction([
      this.prisma.consultationSession.updateMany({
        where: { id, version: session.getVersion() },
        data: { ...data, version: { increment: 1 } },
      }),
      this.prisma.sessionConnectionLog.deleteMany({ where: { consultationSessionId: id } }),
      this.prisma.sessionConnectionLog.createMany({
        data: session.getConnectionLogs().map((log) => ({
          id: log.getId(),
          consultationSessionId: id,
          note: log.getNote(),
          occurredAt: log.getOccurredAt(),
        })),
      }),
    ]);

    if (updateResult.count === 0) {
      throw new ConsultationDomainError(`ConsultationSession "${id}" was modified concurrently; reload and retry.`);
    }
  }
}
