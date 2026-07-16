'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { getWeekDayName } from '@/features/doctor/lib/week';
import { resolveDayForDate } from '@/features/scheduling/utils/resolve-day';
import { generateDaySlots } from '@/features/scheduling/utils/slots';
import type { Holiday, RecurringWeeklySchedule, ScheduleException, SchedulingRules } from '@/features/scheduling/types';
import { addDays } from '@/shared/lib/date/week';
import { AgendaList, type AgendaItem } from '@/shared/ui/schedule/agenda-list';

export interface ScheduleAgendaProps {
  schedule: RecurringWeeklySchedule;
  exceptions: ScheduleException[];
  holidays?: Holiday[];
  rules: SchedulingRules;
  /** The first date the agenda scans from — usually "now." */
  startDate: Date;
  /** How many calendar days forward to scan. */
  days?: number;
  /** Caps the flattened slot list so a long-open availability window doesn't render hundreds of rows. */
  maxItems?: number;
}

/**
 * The "enterprise calendar" Agenda view (Milestone 3) — flattens real
 * generated slots across a date range into one chronological list via
 * `AgendaList`. Built on the same `resolveDayForDate`/`generateDaySlots`
 * every other calendar view uses, so the Agenda never disagrees with what
 * Week/Month/Day show for the same dates.
 */
export function ScheduleAgenda({
  schedule,
  exceptions,
  holidays = [],
  rules,
  startDate,
  days = 14,
  maxItems = 20,
}: ScheduleAgendaProps) {
  const t = useTranslations('doctor.schedule');
  const tSlotStatus = useTranslations('scheduling.slotStatus');
  const format = useFormatter();

  const items: AgendaItem[] = [];
  for (let offset = 0; offset < days && items.length < maxItems; offset += 1) {
    const date = addDays(startDate, offset);
    const weekday = getWeekDayName(date);
    const day = resolveDayForDate(date, weekday, schedule, exceptions, holidays);
    const slots = generateDaySlots(day, rules, date, startDate);

    for (const slot of slots) {
      if (items.length >= maxItems) break;
      items.push({
        id: slot.id,
        dateLabel: format.dateTime(date, { weekday: 'short', month: 'short', day: 'numeric' }),
        timeLabel: format.dateTime(new Date(slot.start), { hour: 'numeric', minute: 'numeric' }),
        title: t(`agendaSlotTitle.${slot.status}`),
        status: slot.status,
        statusLabel: tSlotStatus(slot.status),
      });
    }
  }

  return <AgendaList items={items} emptyTitle={t('agendaEmptyTitle')} emptyDescription={t('agendaEmptyDescription')} />;
}
