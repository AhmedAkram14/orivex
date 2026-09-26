'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import type { Appointment } from '@/features/patient/api/types';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { addWeeks, getWeekDays, isSameDay, startOfWeek } from '@/shared/lib/date/week';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { Button } from '@/shared/ui/button';

export interface AppointmentsCalendarProps {
  appointments: Appointment[];
  /** The day the lists below are filtered to, or null for all days. */
  selectedDay: Date | null;
  onSelectDay: (day: Date | null) => void;
}

/**
 * The Appointments page's week strip: seven tappable days, a dot per
 * appointment (up to three) under each, a pulse "today" pill on today's number,
 * and a tap that filters the Upcoming/History lists to that day (tap again to
 * clear). Read-only otherwise -- booking lives on its own page.
 */
export function AppointmentsCalendar({ appointments, selectedDay, onSelectDay }: AppointmentsCalendarProps) {
  const t = useTranslations('patient.appointments.calendar');
  const tUi = useTranslations('patientAppointmentsUi');
  const format = useFormatter();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const today = new Date();
  const days = getWeekDays(weekStart).map((date) => {
    const count = appointments.filter((appointment) => isSameDay(getCairoNow(new Date(appointment.scheduledAt)), getCairoNow(date))).length;
    return {
      date,
      count,
      isToday: isSameDay(getCairoNow(date), getCairoNow(today)),
      isSelected: selectedDay ? isSameDay(getCairoNow(date), getCairoNow(selectedDay)) : false,
    };
  });

  return (
    <section aria-label={t('title')} className="flex flex-col gap-3 rounded-(--r-card) border border-border-default bg-surface p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-h3 text-text-primary">{t('title')}</h2>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label={t('previousWeek')} onClick={() => setWeekStart((current) => addWeeks(current, -1))}>
            <Icon icon={ChevronLeft} size="sm" flipRtl />
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            {t('today')}
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label={t('nextWeek')} onClick={() => setWeekStart((current) => addWeeks(current, 1))}>
            <Icon icon={ChevronRight} size="sm" flipRtl />
          </Button>
        </div>
      </div>

      <div role="group" aria-label={tUi('dayFilterLabel')} className="grid grid-cols-7 gap-1.5">
        {days.map(({ date, count, isToday, isSelected }) => (
          <button
            key={date.toISOString()}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${format.dateTime(date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${count > 0 ? tUi('appointmentsOnDay', { count }) : tUi('noAppointmentsOnDay')}`}
            onClick={() => onSelectDay(isSelected ? null : date)}
            className={cn(
              'flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-md border px-1 py-2 transition-colors duration-(--duration-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
              isSelected ? 'border-text-primary bg-surface-2' : 'border-transparent hover:bg-surface-2',
            )}
          >
            <span className="text-caption text-text-tertiary">{format.dateTime(date, { weekday: 'short' })}</span>
            <span
              dir="ltr"
              className={cn(
                'flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 font-display text-body font-semibold tabular-nums',
                isToday ? 'bg-pulse text-pulse-foreground' : 'text-text-primary',
              )}
            >
              {format.dateTime(date, { day: 'numeric' })}
            </span>
            <span className="flex h-1.5 items-center gap-0.5" aria-hidden="true">
              {Array.from({ length: Math.min(count, 3) }).map((_, index) => (
                <span key={index} className="size-1.5 rounded-full bg-text-primary" />
              ))}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
