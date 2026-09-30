'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useDoctorUpcomingWork } from '@/features/doctor/hooks/use-doctor-upcoming-work';
import { todayHoursState } from '@/features/doctor/lib/today-hours';
import { useDoctorAvailability } from '@/features/scheduling/hooks/use-doctor-availability';
import { useDoctorExceptions } from '@/features/scheduling/hooks/use-doctor-exceptions';
import { useUpcomingSlots } from '@/features/scheduling/hooks/use-upcoming-slots';
import { cn } from '@/shared/lib/cn';
import { getCairoNow, isSameCairoDay } from '@/shared/lib/date/timezone';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';

interface Range {
  start: number;
  end: number;
}

interface BookedRange extends Range {
  id: string;
  /** The patient (the appointment's own title). */
  who: string;
}

const HOUR = 3_600_000;
/** An appointment booked before `endTime` existed has no known length: drawn as a thin tick, never a fabricated duration. */
const TICK_MS = 10 * 60_000;

/**
 * The doctor's day as one horizontal strip, built only from real data: the
 * hours they are available today (their open/held generated slots) form the
 * track, booked appointments are ink capsules on it, and a pulse marker shows
 * "now". No fabricated hours -- with nothing left to draw it says why, from
 * the doctor's real schedule: today's hours have ended, there are no hours
 * today, nothing is left in today's hours, or no hours are set at all -- with
 * the next real open slot when there is one ("Next: Thu, Oct 1, 9 AM").
 */
export function TodayTimeline({ className }: { className?: string }) {
  const t = useTranslations('doctorHome.timeline');
  const format = useFormatter();
  const { data: slots, isLoading: slotsLoading } = useUpcomingSlots();
  const { data: work, isLoading: workLoading } = useDoctorUpcomingWork();
  const { data: schedule, isLoading: scheduleLoading } = useDoctorAvailability();
  const { data: exceptions, isLoading: exceptionsLoading } = useDoctorExceptions();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (slotsLoading || workLoading || scheduleLoading || exceptionsLoading) return <Skeleton className={cn('h-24 w-full', className)} />;

  const today = new Date(now);
  const available: Range[] = (slots ?? [])
    .filter((slot) => isSameCairoDay(new Date(slot.startTime), today))
    .map((slot) => ({
      start: new Date(slot.startTime).getTime(),
      end: new Date(slot.endTime).getTime(),
    }));
  const booked: BookedRange[] = (work ?? [])
    .filter(
      (item) => item.status !== 'cancelled' && isSameCairoDay(new Date(item.scheduledAt), today),
    )
    .map((item) => {
      const start = new Date(item.scheduledAt).getTime();
      return {
        id: item.id,
        who: item.title,
        start,
        end: item.endTime ? new Date(item.endTime).getTime() : start + TICK_MS,
      };
    });
  const all = [...available, ...booked];

  if (all.length === 0) {
    // Upcoming slots only hold what is still ahead, so an empty strip at 10 PM means today's hours are over,
    // not that there were none: the schedule says which.
    const state = todayHoursState(schedule, exceptions, getCairoNow(today));
    const next = (slots ?? [])
      .map((slot) => new Date(slot.startTime))
      .filter((start) => start.getTime() > now)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const nextLabel = next
      ? t('next', {
          when: format.dateTime(next, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            ...(getCairoNow(next).getMinutes() !== 0 ? { minute: '2-digit' as const } : {}),
          }),
        })
      : undefined;
    const title = { ended: t('hoursEnded'), noneLeft: t('noSlotsLeft'), off: t('noHoursToday'), unset: t('empty') }[state];
    const description = nextLabel ?? (state === 'unset' ? t('emptyHint') : t('nothingUpcoming'));
    return (
      <div className={className}>
        <EmptyState size="sm" illustration="calendar-clear" title={title} description={description} />
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

  const time = (ms: number) =>
    format.dateTime(new Date(ms), { hour: 'numeric', minute: '2-digit' });

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col gap-2', className)}>
        <div className="relative h-10">
          {/* A hairline baseline, not a filled bar -- the strip is a day, never a progress meter. */}
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border-default" />
          {/* the hours you are available: a quiet pulse-20% band */}
          {available.map((range) => (
            <div
              key={`a-${range.start}`}
              title={t('availableLabel', { from: time(range.start), to: time(range.end) })}
              className="absolute top-1/2 h-3 -translate-y-1/2 rounded-sm bg-pulse/20"
              style={{
                insetInlineStart: `${pct(range.start)}%`,
                width: `${Math.max(0.5, pct(range.end) - pct(range.start))}%`,
              }}
            />
          ))}
          {/* booked slots: ink capsules, each naming the patient and time on hover or focus */}
          {booked.map((range) => (
            <Tooltip key={`b-${range.id}`}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`${range.who} · ${time(range.start)} – ${time(range.end)}`}
                  className="absolute top-1/2 h-4 min-w-1.5 -translate-y-1/2 rounded-full bg-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
                  style={{
                    insetInlineStart: `${pct(range.start)}%`,
                    width: `${Math.max(0.6, pct(range.end) - pct(range.start))}%`,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <span className="block font-semibold">
                  <bdi>{range.who}</bdi>
                </span>
                <span className="block" dir="auto">
                  {time(range.start)} – {time(range.end)}
                </span>
              </TooltipContent>
            </Tooltip>
          ))}
          {nowVisible && (
            <div
              className="absolute inset-y-0 -translate-x-1/2 rtl:translate-x-1/2"
              style={{ insetInlineStart: `${pct(now)}%` }}
            >
              <span className="absolute inset-y-0 start-1/2 w-0.5 -translate-x-1/2 rounded-full bg-pulse ring-1 ring-text-primary/20 rtl:translate-x-1/2" />
              <span className="absolute -top-1 start-1/2 -translate-x-1/2 rounded-full bg-pulse px-1.5 text-caption font-semibold text-pulse-foreground rtl:translate-x-1/2">
                {t('now')}
              </span>
            </div>
          )}
        </div>
        <div className="relative h-4" aria-hidden="true">
          {hourMarks.map((ms) => (
            // No `dir` override: the label must resolve inline-start the same way as the bars above it, or in
            // Arabic the hours run left-to-right under a right-to-left day.
            <span
              key={ms}
              className="absolute -translate-x-1/2 text-caption whitespace-nowrap text-text-tertiary tabular-nums rtl:translate-x-1/2"
              style={{ insetInlineStart: `${pct(ms)}%` }}
            >
              {format.dateTime(new Date(ms), { hour: 'numeric' })}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-text-tertiary">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-5 rounded-sm bg-pulse/20" aria-hidden="true" />
            {t('legendAvailable')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-5 rounded-full bg-text-primary" aria-hidden="true" />
            {t('legendBooked')}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
