import type { Holiday as PrismaHolidayRow } from '@prisma/client';

import { Holiday } from '../../domain/entities/holiday.entity.js';

function toIsoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toDomainHoliday(row: PrismaHolidayRow): Holiday {
  return Holiday.reconstitute({ id: row.id, date: toIsoDateOnly(row.date), name: row.name });
}
