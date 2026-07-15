'use client';

import { CalendarClock } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useDoctorAvailability } from '@/features/doctor/hooks/use-doctor-availability';
import { getNextAvailability, isSameDay } from '@/features/doctor/lib/week';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { ScheduleCard } from '@/shared/ui/schedule/schedule-card';

/** The Doctor Dashboard's "next available slot" summary — real (mocked) recurring-availability data reduced to the single next upcoming block via `getNextAvailability`, rendered as a `ScheduleCard`. An honest empty state when no availability is configured at all, never a fabricated slot. */
export function NextAvailabilityCard() {
  const t = useTranslations('doctor.dashboard');
  const format = useFormatter();
  const { data: availability, isLoading } = useDoctorAvailability();

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  const next = availability ? getNextAvailability(availability, new Date()) : null;

  if (!next) {
    return <EmptyState icon={CalendarClock} title={t('noAvailabilityTitle')} />;
  }

  const dateLabel = isSameDay(next.date, new Date())
    ? t('today')
    : format.dateTime(next.date, { weekday: 'long', month: 'short', day: 'numeric' });
  const timeLabel = `${format.dateTime(new Date(0, 0, 0, next.block.startHour), { hour: 'numeric' })} – ${format.dateTime(
    new Date(0, 0, 0, next.block.endHour),
    { hour: 'numeric' },
  )}`;

  return (
    <ScheduleCard
      icon={CalendarClock}
      title={t('nextAvailableSlot')}
      dateLabel={dateLabel}
      timeLabel={timeLabel}
      href="/doctor/schedule"
    />
  );
}
