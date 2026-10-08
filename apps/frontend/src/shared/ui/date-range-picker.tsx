'use client';

import { CalendarRange } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { cairoYear } from '@/shared/lib/date/iso-date';
import { DateField, filterDate } from '@/shared/ui/date-field';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { SegmentedControl } from '@/shared/ui/segmented-control';

export interface DateRangePickerProps {
  /** ISO date (YYYY-MM-DD). Controlled -- this component owns no date state of its own. */
  dateFrom: string;
  /** ISO date (YYYY-MM-DD). */
  dateTo: string;
  onChange: (dateFrom: string, dateTo: string) => void;
  /** Prefix for the two date inputs' ids, unique per page. */
  idPrefix?: string;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toIsoDate(date);
}

function startOfThisMonthIso(): string {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

/**
 * The reporting APIs have no "all time" concept -- they always resolve two concrete ISO dates. "All
 * time" is approximated with a fixed early boundary well before the platform's launch rather than an
 * unsupported "no filter" request.
 */
export const ALL_TIME_START_ISO = '2020-01-01';

/** Last 30 days ending today -- the reporting endpoints' own no-params default, so the picker and the backend never disagree. */
export function getLast30DaysRange(): { dateFrom: string; dateTo: string } {
  return { dateFrom: daysAgoIso(30), dateTo: todayIso() };
}

/**
 * The one date-range toolbar for every report-style page (Reports, Earnings): preset segmented
 * control, then a "Custom range" popover holding the two date inputs. The active preset is derived
 * from the current range each render; no match means a custom range, and the popover trigger then
 * shows that range.
 */
export function DateRangePicker({ dateFrom, dateTo, onChange, idPrefix = 'date-range' }: DateRangePickerProps) {
  const t = useTranslations('ds.dateRange');
  const format = useFormatter();

  const presets = [
    { key: 'preset7Days', dateFrom: daysAgoIso(7), dateTo: todayIso() },
    { key: 'preset30Days', dateFrom: daysAgoIso(30), dateTo: todayIso() },
    { key: 'preset90Days', dateFrom: daysAgoIso(90), dateTo: todayIso() },
    { key: 'presetThisMonth', dateFrom: startOfThisMonthIso(), dateTo: todayIso() },
    { key: 'presetAllTime', dateFrom: ALL_TIME_START_ISO, dateTo: todayIso() },
  ] as const;
  type PresetKey = (typeof presets)[number]['key'];
  const activePresetKey = presets.find((preset) => preset.dateFrom === dateFrom && preset.dateTo === dateTo)?.key;
  const rangeLabel = `${format.dateTime(new Date(`${dateFrom}T00:00:00`), { dateStyle: 'medium' })} – ${format.dateTime(new Date(`${dateTo}T00:00:00`), { dateStyle: 'medium' })}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl<PresetKey>
        ariaLabel={t('custom')}
        options={presets.map((preset) => ({ value: preset.key, label: t(preset.key) }))}
        value={activePresetKey}
        onChange={(key) => {
          const preset = presets.find((item) => item.key === key);
          if (preset) onChange(preset.dateFrom, preset.dateTo);
        }}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="secondary" size="sm" aria-pressed={!activePresetKey}>
            <Icon icon={CalendarRange} size="sm" />
            <span dir="auto">{activePresetKey ? t('custom') : rangeLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="flex w-auto flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span id={`${idPrefix}-from-label`} className="text-caption text-text-tertiary">
              {t('from')}
            </span>
            <DateField
              id={`${idPrefix}-from`}
              labelledBy={`${idPrefix}-from-label`}
              value={dateFrom}
              onChange={(value) => filterDate(value, (date) => date && onChange(date, dateTo))}
              fromYear={2020}
              toYear={cairoYear()}
              className="w-72"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span id={`${idPrefix}-to-label`} className="text-caption text-text-tertiary">
              {t('to')}
            </span>
            <DateField
              id={`${idPrefix}-to`}
              labelledBy={`${idPrefix}-to-label`}
              value={dateTo}
              onChange={(value) => filterDate(value, (date) => date && onChange(dateFrom, date))}
              fromYear={2020}
              toYear={cairoYear() + 1}
              className="w-72"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
