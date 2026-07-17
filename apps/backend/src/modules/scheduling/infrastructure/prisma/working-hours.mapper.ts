import type { Prisma, WorkingHoursDay as PrismaWorkingHoursDayRow } from '@prisma/client';

import { WorkingHoursDay, type TimeRangeProps } from '../../domain/entities/working-hours-day.entity.js';

import { toDomainWeekDay, toPrismaWeekDay } from './week-day.mapper.js';

function parseBreaks(value: unknown): TimeRangeProps[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { start: string; end: string } => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { start?: unknown }).start === 'string' &&
        typeof (item as { end?: unknown }).end === 'string'
      );
    })
    .map((item) => ({ start: item.start, end: item.end }));
}

export function toDomainWorkingHoursDay(row: PrismaWorkingHoursDayRow): WorkingHoursDay {
  return WorkingHoursDay.reconstitute({
    id: row.id,
    doctorId: row.doctorId,
    dayOfWeek: toDomainWeekDay(row.dayOfWeek),
    isWorkingDay: row.isWorkingDay,
    hours: { start: row.startTime, end: row.endTime },
    breaks: parseBreaks(row.breaks),
    updatedAt: row.updatedAt,
  });
}

export function toPersistedWorkingHoursDay(day: WorkingHoursDay) {
  return {
    id: day.getId(),
    doctorId: day.getDoctorId(),
    dayOfWeek: toPrismaWeekDay(day.getDayOfWeek()),
    isWorkingDay: day.getIsWorkingDay(),
    startTime: day.getHours().start,
    endTime: day.getHours().end,
    // Plain array of { start, end } objects -- a valid Json value, just not
    // structurally assignable to Prisma's InputJsonValue without this cast
    // (Prisma's type only rejects it because it can't statically prove the
    // array elements are JSON-safe; TimeRangeProps always is).
    breaks: day.getBreaks() as unknown as Prisma.InputJsonValue,
  };
}
