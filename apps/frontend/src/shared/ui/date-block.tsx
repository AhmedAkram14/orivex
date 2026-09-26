'use client';

import { useFormatter } from 'next-intl';
import { cn } from '@/shared/lib/cn';

export interface DateBlockProps {
  /** ISO string or Date. Formatted in the operating time zone (Africa/Cairo) by next-intl's formatter. */
  date: string | Date;
  className?: string;
}

/**
 * A 48x56 calendar tile: the day number in the display face, the month and
 * weekday as a caption. Used on every appointment row in both roles so a date
 * scans the same everywhere. Numbers are isolated (`dir="ltr"`) so Arabic-Indic
 * or Latin digits never reorder against surrounding text.
 */
export function DateBlock({ date, className }: DateBlockProps) {
  const format = useFormatter();
  const value = typeof date === 'string' ? new Date(date) : date;

  return (
    <div
      className={cn(
        'flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-surface-2 text-center',
        className,
      )}
    >
      <span aria-hidden="true" className="text-caption leading-3.5 text-text-tertiary">
        {format.dateTime(value, { weekday: 'short' })}
      </span>
      <span aria-hidden="true" dir="ltr" className="font-display text-xl leading-5 font-semibold text-text-primary tabular-nums">
        {format.dateTime(value, { day: 'numeric' })}
      </span>
      <span aria-hidden="true" className="text-caption leading-3.5 text-text-tertiary">
        {format.dateTime(value, { month: 'short' })}
      </span>
      <span className="sr-only">{format.dateTime(value, { dateStyle: 'full' })}</span>
    </div>
  );
}
