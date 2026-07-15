'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import type { Appointment } from '@/features/patient/api/types';
import { addWeeks, getWeekDays, isSameDay, startOfWeek } from '@/shared/lib/date/week';
import { Badge } from '@/shared/ui/badge';
import { DateNavigation } from '@/shared/ui/schedule/date-navigation';
import { WeeklyCalendar, type WeeklyCalendarDay } from '@/shared/ui/schedule/weekly-calendar';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

export interface AppointmentsCalendarProps {
  appointments: Appointment[];
}

/**
 * The Appointments page's calendar foundation — a week grid (reusing the
 * same `WeeklyCalendar`/`DateNavigation` primitives Doctor Portal's Schedule
 * milestone built) marking which days have appointments, read-only for now
 * (no day-click drill-down, no booking — that's Phase 9's Appointment
 * System & Calendar scope, not this milestone's).
 */
export function AppointmentsCalendar({ appointments }: AppointmentsCalendarProps) {
  const t = useTranslations('patient.appointments.calendar');
  const format = useFormatter();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const today = new Date();
  const days: WeeklyCalendarDay[] = getWeekDays(weekStart).map((date) => {
    const countThatDay = appointments.filter((appointment) => isSameDay(new Date(appointment.scheduledAt), date)).length;
    return {
      id: date.toISOString(),
      dayLabel: format.dateTime(date, { weekday: 'short' }),
      dateLabel: format.dateTime(date, { day: 'numeric' }),
      isToday: isSameDay(date, today),
      content: countThatDay > 0 ? <Badge variant="info">{countThatDay}</Badge> : undefined,
    };
  });

  return (
    <WidgetContainer
      title={t('title')}
      actions={
        <DateNavigation
          onPrevious={() => setWeekStart((current) => addWeeks(current, -1))}
          onNext={() => setWeekStart((current) => addWeeks(current, 1))}
          onToday={() => setWeekStart(startOfWeek(new Date()))}
          todayLabel={t('today')}
          previousLabel={t('previousWeek')}
          nextLabel={t('nextWeek')}
        />
      }
    >
      <WeeklyCalendar days={days} todayAnnouncement={t('today')} />
    </WidgetContainer>
  );
}
