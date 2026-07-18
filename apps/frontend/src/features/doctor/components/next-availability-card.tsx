'use client';

import { CalendarClock } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { getNextAvailability, isSameDay } from '@/features/doctor/lib/week';
import { useDoctorAvailability } from '@/features/scheduling/hooks/use-doctor-availability';
import { combineDateAndTime } from '@/features/scheduling/utils/time';
import { Alert } from '@/shared/ui/alert';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { ScheduleCard } from '@/shared/ui/schedule/schedule-card';

/** The Doctor Dashboard's "next available slot" summary — real (mocked) recurring-availability data reduced to the single next upcoming block via `getNextAvailability`, rendered as a `ScheduleCard`. An honest empty state when no availability is configured at all, never a fabricated slot. */
export function NextAvailabilityCard() {
  const t = useTranslations('doctor.dashboard');
  const format = useFormatter();
  const { data: availability, isLoading, isError } = useDoctorAvailability();

  if (isError) {
    return <Alert variant="danger">{t('availabilityLoadError')}</Alert>;
  }

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
  const timeLabel = `${format.dateTime(combineDateAndTime(new Date(0, 0, 0), next.day.hours.start), { hour: 'numeric' })} – ${format.dateTime(
    combineDateAndTime(new Date(0, 0, 0), next.day.hours.end),
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
