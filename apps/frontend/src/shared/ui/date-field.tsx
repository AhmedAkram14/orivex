'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState, type FocusEvent, type Ref } from 'react';
import { cn } from '@/shared/lib/cn';
import { NativeSelect } from '@/shared/ui/native-select';

export { cairoToday, cairoYear, isRealIsoDate } from '@/shared/lib/date/iso-date';

export type DateFieldGranularity = 'day' | 'month';

export interface DateFieldProps {
  /** `YYYY-MM-DD` (the format every date field in this app already sends), or '' when empty. */
  value: string | undefined;
  onChange: (value: string) => void;
  /** Called once focus leaves all the parts (a form's "touched"), not when it moves between them. */
  onBlur?: () => void;
  /** `day`: Day / Month / Year. `month`: Month / Year only, stored as the 1st of the month. */
  granularity?: DateFieldGranularity;
  /** Inclusive year bounds; years are listed newest first. */
  fromYear: number;
  toYear: number;
  /** id of the visible label naming the whole date. */
  labelledBy?: string;
  /** id for the first part, so a `<label htmlFor>` lands on it. */
  id?: string;
  invalid?: boolean;
  describedBy?: string;
  /** The first part, so a form can move focus to the field. */
  firstRef?: Ref<HTMLSelectElement>;
  disabled?: boolean;
  className?: string;
}

interface Parts {
  day: string;
  month: string;
  year: string;
}

function partsOf(value: string | undefined): Parts {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return { day: '', month: '', year: '' };
  return {
    year: match[1] === '0000' ? '' : match[1]!,
    month: match[2] === '00' ? '' : match[2]!,
    day: match[3] === '00' ? '' : match[3]!,
  };
}

function compose({ day, month, year }: Parts, granularity: DateFieldGranularity): string {
  const dayPart = granularity === 'month' ? (month || year ? '01' : '') : day;
  if (!dayPart && !month && !year) return '';
  // A partial date stays a partial string ("0000-03-15") so a schema can reject it as incomplete.
  return `${year || '0000'}-${month || '00'}-${dayPart || '00'}`;
}

/** True when `value` has every part of a `YYYY-MM-DD` date filled in (it may still not be a real date -- see `isRealIsoDate`). */
export function isCompleteDate(value: string | undefined): boolean {
  const parts = partsOf(value);
  return Boolean(parts.day && parts.month && parts.year);
}

/**
 * A date as separate selects -- Day / Month / Year (or Month / Year) -- in place of the browser's date picker, whose
 * `mm/dd/yyyy` order is US-only and whose year wheel is slow for dates far back. Day-first (the en-EG and Arabic
 * order); in RTL the parts mirror visually and keep their logical order. Months by name, years newest first. The
 * value stays the `YYYY-MM-DD` string the old date input produced, so no API contract changes.
 */
export function DateField({
  value,
  onChange,
  onBlur,
  granularity = 'day',
  fromYear,
  toYear,
  labelledBy,
  id,
  invalid,
  describedBy,
  firstRef,
  disabled,
  className,
}: DateFieldProps) {
  const t = useTranslations('ds.dateField');
  const format = useFormatter();
  const [parts, setParts] = useState<Parts>(() => partsOf(value));

  // Follow an outside change of a complete value (a form reset or a prefill), never a partial one this field made.
  useEffect(() => {
    if (value && compose(parts, granularity) !== value) setParts(partsOf(value));
    if (!value && compose(parts, granularity) !== '') setParts({ day: '', month: '', year: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only an outside value change should resync the parts
  }, [value]);

  function update(next: Partial<Parts>) {
    const merged = { ...parts, ...next };
    setParts(merged);
    onChange(compose(merged, granularity));
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (onBlur && !event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur();
  }

  const years: number[] = [];
  for (let year = toYear; year >= fromYear; year -= 1) years.push(year);

  const shared = {
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
    disabled,
  };

  const day = (
    <NativeSelect
      key="day"
      ref={firstRef}
      id={id}
      aria-label={t('day')}
      value={parts.day}
      onChange={(event) => update({ day: event.target.value })}
      {...shared}
    >
      <option value="">{t('day')}</option>
      {Array.from({ length: 31 }, (_, index) => (
        <option
          key={index}
          value={String(index + 1).padStart(2, '0')}
          className="text-text-primary"
        >
          {format.number(index + 1)}
        </option>
      ))}
    </NativeSelect>
  );
  const month = (
    <NativeSelect
      key="month"
      ref={granularity === 'month' ? firstRef : undefined}
      id={granularity === 'month' ? id : undefined}
      aria-label={t('month')}
      value={parts.month}
      onChange={(event) => update({ month: event.target.value })}
      {...shared}
    >
      <option value="">{t('month')}</option>
      {Array.from({ length: 12 }, (_, index) => (
        <option
          key={index}
          value={String(index + 1).padStart(2, '0')}
          className="text-text-primary"
        >
          {format.dateTime(new Date(Date.UTC(2000, index, 1)), { month: 'short', timeZone: 'UTC' })}
        </option>
      ))}
    </NativeSelect>
  );
  const year = (
    <NativeSelect
      key="year"
      aria-label={t('year')}
      value={parts.year}
      onChange={(event) => update({ year: event.target.value })}
      {...shared}
    >
      <option value="">{t('year')}</option>
      {years.map((option) => (
        <option key={option} value={String(option)} className="text-text-primary">
          {format.number(option, { useGrouping: false })}
        </option>
      ))}
    </NativeSelect>
  );

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      onBlur={handleBlur}
      className={cn(
        'grid gap-2',
        granularity === 'day' ? 'grid-cols-[1fr_1.35fr_1.2fr]' : 'grid-cols-[1.35fr_1.2fr]',
        className,
      )}
    >
      {granularity === 'day' ? [day, month, year] : [month, year]}
    </div>
  );
}
