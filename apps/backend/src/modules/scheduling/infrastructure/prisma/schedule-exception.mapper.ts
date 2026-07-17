import type { ScheduleException as PrismaScheduleExceptionRow } from '@prisma/client';

import { ScheduleException } from '../../domain/entities/schedule-exception.entity.js';

import { toDomainScheduleExceptionType, toPrismaScheduleExceptionType } from './schedule-exception-type.mapper.js';

function toIsoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toDomainScheduleException(row: PrismaScheduleExceptionRow): ScheduleException {
  return ScheduleException.reconstitute({
    id: row.id,
    doctorId: row.doctorId,
    date: toIsoDateOnly(row.date),
    type: toDomainScheduleExceptionType(row.type),
    hours: row.startTime && row.endTime ? { start: row.startTime, end: row.endTime } : undefined,
    reason: row.reason ?? undefined,
    createdAt: row.createdAt,
  });
}

export function toPersistedScheduleException(exception: ScheduleException) {
  const hours = exception.getHours();
  return {
    id: exception.getId(),
    doctorId: exception.getDoctorId(),
    date: new Date(`${exception.getDate()}T00:00:00.000Z`),
    type: toPrismaScheduleExceptionType(exception.getType()),
    startTime: hours?.start ?? null,
    endTime: hours?.end ?? null,
    reason: exception.getReason() ?? null,
  };
}
