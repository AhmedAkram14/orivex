import type {
  ConsultationSession as PrismaConsultationSessionRow,
  SessionConnectionLog as PrismaSessionConnectionLogRow,
} from '@prisma/client';

import { ConsultationSession } from '../../domain/entities/consultation-session.entity.js';
import { SessionConnectionLog } from '../../domain/entities/session-connection-log.entity.js';

import { toDomainConsultationCompletionReason } from './consultation-completion-reason.mapper.js';
import { toDomainConsultationState } from './consultation-state.mapper.js';

export type PersistedConsultationSessionRow = PrismaConsultationSessionRow & {
  connectionLogs: PrismaSessionConnectionLogRow[];
};

export function toDomainConsultationSession(row: PersistedConsultationSessionRow): ConsultationSession {
  return ConsultationSession.reconstitute({
    id: row.id,
    appointmentId: row.appointmentId,
    state: toDomainConsultationState(row.state),
    completionReason: row.completionReason ? toDomainConsultationCompletionReason(row.completionReason) : undefined,
    startedAt: row.startedAt ?? undefined,
    closedAt: row.closedAt ?? undefined,
    connectionLogs: row.connectionLogs.map((log) =>
      SessionConnectionLog.reconstitute({ id: log.id, note: log.note, occurredAt: log.occurredAt }),
    ),
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
