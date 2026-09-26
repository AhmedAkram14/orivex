'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useDoctorUpcomingWork } from '@/features/doctor/hooks/use-doctor-upcoming-work';
import { useUpcomingSlots } from '@/features/scheduling/hooks/use-upcoming-slots';
import { cn } from '@/shared/lib/cn';
import { isSameCairoDay } from '@/shared/lib/date/timezone';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';

interface Range {
  start: number;
  end: number;
}

const HOUR = 3_600_000;
/** An appointment booked before `endTime` existed has no known length: drawn as a thin tick, never a fabricated duration. */
const TICK_MS = 10 * 60_000;

/**
 * The doctor's day as one horizontal strip, built only from real data: the
 * hours they are available today (their open/held generated slots) form the
 * track, booked appointments are ink capsules on it, and a pulse marker shows
 * "now". No fabricated hours -- with nothing on the calendar it renders an
 * honest empty state.
 */
export function TodayTimeline({ className }: { className?: string }) {
  const t = useTranslations('doctorHome.timeline');
  const format = useFormatter();
  const { data: slots, isLoading: slotsLoading } = useUpcomingSlots();
  const { data: work, isLoading: workLoading } = useDoctorUpcomingWork();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (slotsLoading || workLoading) return <Skeleton className={cn('h-24 w-full', className)} />;

  const today = new Date(now);
  const available: Range[] = (slots ?? [])
    .filter((slot) => isSameCairoDay(new Date(slot.startTime), today))
    .map((slot) => ({ start: new Date(slot.startTime).getTime(), end: new Date(slot.endTime).getTime() }));
  const booked: Range[] = (work ?? [])
    .filter((item) => item.status !== 'cancelled' && isSameCairoDay(new Date(item.scheduledAt), today))
    .map((item) => {
      const start = new Date(item.scheduledAt).getTime();
      return { start, end: item.endTime ? new Date(item.endTime).getTime() : start + TICK_MS };
    });
  const all = [...available, ...booked];

  if (all.length === 0) {
    return (
      <div className={className}>
        <EmptyState size="sm" illustration="calendar-clear" title={t('empty')} description={t('emptyHint')} />
      </div>
    );
  }

  const min = Math.floor(Math.min(...all.map((range) => range.start)) / HOUR) * HOUR;
  const max = Math.ceil(Math.max(...all.map((range) => range.end)) / HOUR) * HOUR;
  const span = Math.max(HOUR, max - min);
  const pct = (ms: number) => Math.min(100, Math.max(0, ((ms - min) / span) * 100));
  const nowVisible = now >= min && now <= max;

  const hourMarks: number[] = [];
  const stepHours = span / HOUR > 10 ? 2 : 1;
  for (let ms = min; ms <= max; ms += stepHours * HOUR) hourMarks.push(ms);

  const time = (ms: number) => format.dateTime(new Date(ms), { hour: 'numeric', minute: '2-digit' });

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="relative h-10">
        {/* the track: the hours you are available */}
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-surface-2" />
        {available.map((range) => (
          <div
            key={`a-${range.start}`}
            title={t('availableLabel', { from: time(range.start), to: time(range.end) })}
            className="absolute top-1/2 h-2 -translate-y-1/2 bg-pulse/40"
            style={{ insetInlineStart: `${pct(range.start)}%`, width: `${Math.max(0.5, pct(range.end) - pct(range.start))}%` }}
          />
        ))}
        {/* booked slots: ink capsules */}
        {booked.map((range) => (
          <div
            key={`b-${range.start}`}
            title={t('bookedLabel', { time: time(range.start) })}
            className="absolute top-1/2 h-4 min-w-1.5 -translate-y-1/2 rounded-full bg-text-primary"
            style={{ insetInlineStart: `${pct(range.start)}%`, width: `${Math.max(0.6, pct(range.end) - pct(range.start))}%` }}
          />
        ))}
        {nowVisible && (
          <div className="absolute inset-y-0 -translate-x-1/2 rtl:translate-x-1/2" style={{ insetInlineStart: `${pct(now)}%` }}>
            <span className="absolute inset-y-0 start-1/2 w-0.5 -translate-x-1/2 rounded-full bg-pulse ring-1 ring-text-primary/20 rtl:translate-x-1/2" />
            <span className="absolute -top-1 start-1/2 -translate-x-1/2 rounded-full bg-pulse px-1.5 text-caption font-semibold text-pulse-foreground rtl:translate-x-1/2">
              {t('now')}
            </span>
          </div>
        )}
      </div>
      <div className="relative h-4" aria-hidden="true">
        {hourMarks.map((ms) => (
          <span
            key={ms}
            dir="ltr"
            className="absolute -translate-x-1/2 text-caption text-text-tertiary tabular-nums rtl:translate-x-1/2"
            style={{ insetInlineStart: `${pct(ms)}%` }}
          >
            {format.dateTime(new Date(ms), { hour: 'numeric' })}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-5 bg-pulse/40" aria-hidden="true" />
          {t('legendAvailable')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-5 rounded-full bg-text-primary" aria-hidden="true" />
          {t('legendBooked')}
        </span>
      </div>
    </div>
  );
}
