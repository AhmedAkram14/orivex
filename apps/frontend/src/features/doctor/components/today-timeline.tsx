'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useDoctorUpcomingWork } from '@/features/doctor/hooks/use-doctor-upcoming-work';
import { todayHours, todayHoursState } from '@/features/doctor/lib/today-hours';
import { useDoctorAvailability } from '@/features/scheduling/hooks/use-doctor-availability';
import { useDoctorExceptions } from '@/features/scheduling/hooks/use-doctor-exceptions';
import { useUpcomingSlots } from '@/features/scheduling/hooks/use-upcoming-slots';
import { toMinutes } from '@/features/scheduling/utils/time';
import { cn } from '@/shared/lib/cn';
import { getCairoNow, isSameCairoDay } from '@/shared/lib/date/timezone';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';

export interface DayStripRange {
  start: number;
  end: number;
}

export interface DayStripBooking extends DayStripRange {
  id: string;
  /** The patient (the appointment's own title). */
  who: string;
}

const HOUR = 3_600_000;
/** An appointment booked before `endTime` existed has no known length: drawn as a thin tick, never a fabricated duration. */
const TICK_MS = 10 * 60_000;

/** Touching or overlapping ranges as one: back-to-back open slots draw as one free band, not a row of outlines. */
function mergeRanges(ranges: DayStripRange[]): DayStripRange[] {
  const merged: DayStripRange[] = [];
  for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ start: range.start, end: range.end });
  }
  return merged;
}

/** `ranges` with every `cuts` interval taken out (pieces under a minute dropped). */
function subtractRanges(ranges: DayStripRange[], cuts: DayStripRange[]): DayStripRange[] {
  let pieces = ranges;
  for (const cut of cuts) {
    pieces = pieces.flatMap((piece) =>
      cut.end <= piece.start || cut.start >= piece.end
        ? [piece]
        : [
            { start: piece.start, end: cut.start },
            { start: cut.end, end: piece.end },
          ].filter((part) => part.end - part.start >= 60_000),
    );
  }
  return pieces;
}

/**
 * The doctor's day as one horizontal strip, built only from real data: the whole working day (today's hours from
 * their schedule) is the window, their open slots are free bands on it, booked appointments are ink capsules, the
 * rest -- including time already past -- is hatched, and an ink line marks "now". No fabricated hours. When nothing
 * open is left today a line above the strip says why (today's hours have ended, or nothing is left in them) with the
 * next real open slot ("Next: Fri, Oct 2, 9 AM"); a day with no hours and nothing booked keeps the empty state
 * (no hours today, or no hours set at all).
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
  const cairoToday = getCairoNow(today);
  const available: DayStripRange[] = (slots ?? [])
    .filter((slot) => isSameCairoDay(new Date(slot.startTime), today))
    .map((slot) => ({
      start: new Date(slot.startTime).getTime(),
      end: new Date(slot.endTime).getTime(),
    }));
  const booked: DayStripBooking[] = (work ?? [])
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
  // Today's working hours as instants (Cairo wall clock): the strip spans the whole working day, so the morning
  // stays in view after it has passed.
  const hours = todayHours(schedule, exceptions, cairoToday);
  const cairoMidnight =
    now - (now % 1000) - ((cairoToday.getHours() * 60 + cairoToday.getMinutes()) * 60 + cairoToday.getSeconds()) * 1000;
  const bounds = hours
    ? { start: cairoMidnight + toMinutes(hours.start) * 60_000, end: cairoMidnight + toMinutes(hours.end) * 60_000 }
    : undefined;

  // Upcoming slots only hold what is still ahead, so "nothing open" at 10 PM means today's hours are over, not
  // that there were none: the schedule says which.
  const state = todayHoursState(schedule, exceptions, cairoToday);
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

  if (!bounds && available.length === 0 && booked.length === 0) {
    const title = { ended: t('hoursEnded'), noneLeft: t('noSlotsLeft'), off: t('noHoursToday'), unset: t('empty') }[state];
    const description = nextLabel ?? (state === 'unset' ? t('emptyHint') : t('nothingUpcoming'));
    return (
      <div className={className}>
        <EmptyState size="sm" illustration="calendar-clear" title={title} description={description} />
      </div>
    );
  }

  // Said only when it is news: no open time left, and (once the hours are over) no visit still ahead either --
  // a visit drawn ahead on the strip already says the day isn't done.
  const visitAhead = booked.some((range) => range.end > now);
  const caption =
    available.length === 0 && ((state === 'ended' && !visitAhead) || state === 'noneLeft')
      ? `${state === 'ended' ? t('hoursEnded') : t('noSlotsLeft')} · ${nextLabel ?? t('nothingUpcoming')}`
      : undefined;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {caption && (
        <p data-timeline-caption="" className="text-small text-text-secondary">
          {caption}
        </p>
      )}
      <DayStrip
        available={available}
        booked={booked}
        bounds={bounds}
        now={now}
        hourLabel={(ms) => format.dateTime(new Date(ms), { hour: 'numeric' })}
        timeLabel={(ms) => format.dateTime(new Date(ms), { hour: 'numeric', minute: '2-digit' })}
      />
    </div>
  );
}

export interface DayStripProps {
  available: DayStripRange[];
  booked: DayStripBooking[];
  /** The day's own span (today's working hours): the window always covers it, so past and idle hours stay in view. */
  bounds?: DayStripRange;
  /** The instant the pulse "now" marker stands at. */
  now: number;
  /** The label under each hour mark (a clock hour on the Overview, a relative offset in the landing preview). */
  hourLabel: (ms: number) => string;
  /** A time for the available bands' titles and the booked capsules' labels. */
  timeLabel: (ms: number) => string;
  /**
   * An illustrative strip (the landing page's product preview): booked capsules are plain shapes -- no tooltip,
   * no button, nothing to focus -- since they stand for no real appointment.
   */
  preview?: boolean;
  /** Extra classes on the now marker's line (e.g. a draw-in transition). */
  nowMarkerClassName?: string;
  className?: string;
}

/**
 * The day strip itself, pure: on one horizontal track, free time as lime bands with an olive stroke, booked time as
 * ink capsules, everything else (nothing open, or already past) hatched, and an ink "now" line under a lime pill;
 * hour marks under it and a three-item legend. Colours come from the availability tokens (`avail-fill`,
 * `avail-stroke`, `--pattern-unavailable`); the stroke and the ink hold 3:1 against the surface in both themes.
 * `TodayTimeline` feeds it the doctor's real day; the landing page's doctor showcase feeds it illustrative ranges in
 * `preview` mode -- one strip, never a copy of it.
 */
export function DayStrip({ available, booked, bounds, now, hourLabel, timeLabel, preview = false, nowMarkerClassName, className }: DayStripProps) {
  const t = useTranslations('doctorHome.timeline');
  // Free time is what is open and not booked (an open slot list may still hold a slot that has since been taken).
  const bands = subtractRanges(mergeRanges(available), booked);
  const all = [...bands, ...booked, ...(bounds ? [bounds] : [])];
  const min = Math.floor(Math.min(...all.map((range) => range.start)) / HOUR) * HOUR;
  const max = Math.ceil(Math.max(...all.map((range) => range.end)) / HOUR) * HOUR;
  const span = Math.max(HOUR, max - min);
  const pct = (ms: number) => Math.min(100, Math.max(0, ((ms - min) / span) * 100));
  const nowVisible = now >= min && now <= max;

  // Every hour is marked; on a narrow strip (under 40rem) a long day keeps every other label, so none collide.
  const hourMarks: number[] = [];
  for (let ms = min; ms <= max; ms += HOUR) hourMarks.push(ms);
  const thinLabels = hourMarks.length > 7;

  return (
    <TooltipProvider>
      <div data-day-strip="" className={cn('@container flex flex-col gap-2', className)}>
        <div className="relative h-10">
          {/* The whole window, hatched: time with nothing open (or already past). Free bands and visits sit on it. */}
          <div
            data-strip-segment="unavailable"
            className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-[6px] bg-(image:--pattern-unavailable)"
          />
          {/* free time: a solid lime band with a 1.5px olive stroke (the stroke carries the contrast) */}
          {bands.map((range) => (
            <div
              key={`a-${range.start}`}
              data-strip-segment="available"
              title={t('availableLabel', { from: timeLabel(range.start), to: timeLabel(range.end) })}
              className="absolute top-1/2 h-3 -translate-y-1/2 rounded-[6px] border-[1.5px] border-avail-stroke bg-avail-fill"
              style={{
                insetInlineStart: `${pct(range.start)}%`,
                width: `${Math.max(0.5, pct(range.end) - pct(range.start))}%`,
              }}
            />
          ))}
          {/* booked slots: ink capsules, each naming the patient and time on hover or focus */}
          {booked.map((range) =>
            preview ? (
              <span
                key={`b-${range.id}`}
                data-strip-segment="booked"
                className="absolute top-1/2 h-4 min-w-1.5 -translate-y-1/2 rounded-full bg-text-primary"
                style={{
                  insetInlineStart: `${pct(range.start)}%`,
                  width: `${Math.max(0.6, pct(range.end) - pct(range.start))}%`,
                }}
              />
            ) : (
              <Tooltip key={`b-${range.id}`}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    data-strip-segment="booked"
                    aria-label={`${range.who} · ${timeLabel(range.start)} – ${timeLabel(range.end)}`}
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
                    {timeLabel(range.start)} – {timeLabel(range.end)}
                  </span>
                </TooltipContent>
              </Tooltip>
            ),
          )}
          {nowVisible && (
            <div
              className="absolute inset-y-0 -translate-x-1/2 rtl:translate-x-1/2"
              style={{ insetInlineStart: `${pct(now)}%` }}
            >
              {/* A 2px ink line through the track, edged in the surface so it stays visible across a booked capsule. */}
              <span
                data-strip-now=""
                className={cn(
                  'absolute inset-y-0 start-1/2 w-0.5 -translate-x-1/2 bg-text-primary shadow-[0_0_0_1px_var(--color-surface)] rtl:translate-x-1/2',
                  nowMarkerClassName,
                )}
              />
              <span className="absolute -top-1 start-1/2 -translate-x-1/2 rounded-full bg-pulse px-1.5 text-caption font-semibold text-pulse-foreground rtl:translate-x-1/2">
                {t('now')}
              </span>
            </div>
          )}
        </div>
        <div className="relative h-4" aria-hidden="true">
          {hourMarks.map((ms, index) => (
            // No `dir` override: the label must resolve inline-start the same way as the bars above it, or in
            // Arabic the hours run left-to-right under a right-to-left day.
            <span
              key={ms}
              className={cn(
                'absolute -translate-x-1/2 text-caption whitespace-nowrap text-text-tertiary tabular-nums rtl:translate-x-1/2',
                thinLabels && index % 2 === 1 && '@max-pane:hidden',
              )}
              style={{ insetInlineStart: `${pct(ms)}%` }}
            >
              {hourLabel(ms)}
            </span>
          ))}
        </div>
        {/* The same three marks as the track, at 12x12. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-text-tertiary">
          <span className="inline-flex items-center gap-1.5">
            <span
              data-legend-swatch="available"
              className="size-3 rounded-[3px] border-[1.5px] border-avail-stroke bg-avail-fill"
              aria-hidden="true"
            />
            {t('legendAvailable')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span data-legend-swatch="booked" className="size-3 rounded-full bg-text-primary" aria-hidden="true" />
            {t('legendBooked')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              data-legend-swatch="unavailable"
              className="size-3 rounded-[3px] border border-border-default bg-(image:--pattern-unavailable)"
              aria-hidden="true"
            />
            {t('legendUnavailable')}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
