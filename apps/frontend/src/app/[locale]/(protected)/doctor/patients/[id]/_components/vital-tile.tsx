'use client';

import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useLocale, useFormatter, useTranslations } from 'next-intl';
import { Icon } from '@/shared/icons/icon';
import { Badge } from '@/shared/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { formatExactDateTime } from '@/shared/lib/date/format-datetime';
import { formatRelativeTime } from '@/shared/lib/date/relative-time';
import { cn } from '@/shared/lib/cn';
import type { DoctorPatientChartVitalSummary } from '@/features/doctor/api/types';
import { VITAL_STALE_AFTER_DAYS, isStale } from '../_lib/vital-staleness';
import { flagBloodPressure, flagGlucose, type RangeFlag } from '../_lib/vital-reference-ranges';

export interface VitalTileProps {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  summary: DoctorPatientChartVitalSummary | undefined;
  notOnRecordLabel: string;
}

function computeRangeFlag(summary: DoctorPatientChartVitalSummary): RangeFlag | null {
  if (!summary.latest) return null;
  if (summary.type === 'blood-pressure' && summary.latest.diastolicValue !== undefined) {
    return flagBloodPressure(summary.latest.value, summary.latest.diastolicValue);
  }
  if (summary.type === 'blood-sugar') {
    return flagGlucose(summary.latest.value);
  }
  return null;
}

// "Since <date>" is a neutral fact -- never colored red/green -- because
// whether a trend is good or bad depends on treatment context this page
// doesn't have (weight going up isn't bad; BP going down isn't good if the
// patient is being treated for it).
function TrendIndicator({ summary }: { summary: DoctorPatientChartVitalSummary }) {
  const format = useFormatter();
  const t = useTranslations('publicPatient');
  const readings = summary.readings;
  if (readings.length < 2) return null;
  const latest = readings[readings.length - 1];
  const previous = readings[readings.length - 2];
  // Rounded to 1 decimal place -- raw floating-point subtraction (e.g.
  // 73.2 - 71.1) produces artifacts like 2.1000000000000085 in JS.
  const rawDelta = Math.round(Math.abs(latest.value - previous.value) * 10) / 10;
  if (rawDelta === 0) return null;
  const TrendIcon = latest.value - previous.value > 0 ? TrendingUp : TrendingDown;
  const unit = latest.valueLabel.replace(/^[\d./\s-]+/, '').trim();
  return (
    <p className="flex items-center gap-1 text-xs text-text-tertiary">
      <Icon icon={TrendIcon} size="xs" />
      {t('vitalTrend', {
        delta: `${rawDelta}${unit ? ` ${unit}` : ''}`,
        date: format.dateTime(new Date(previous.recordedAt), { dateStyle: 'medium' }),
      })}
    </p>
  );
}

export function VitalTile({ icon, iconClassName, label, summary, notOnRecordLabel }: VitalTileProps) {
  const t = useTranslations('publicPatient');
  const locale = useLocale();
  const format = useFormatter();
  const latest = summary?.latest;

  if (!latest) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border-default/70 bg-surface p-3">
        <div className={cn('flex size-8 items-center justify-center rounded-lg', iconClassName)}>
          <Icon icon={icon} size="sm" />
        </div>
        <div>
          <p className="text-xs text-text-tertiary">{label}</p>
          <p className="text-sm font-medium text-text-primary">{notOnRecordLabel}</p>
        </div>
      </div>
    );
  }

  const recordedAt = new Date(latest.recordedAt);
  const stale = isStale(recordedAt, VITAL_STALE_AFTER_DAYS);
  const rangeFlag = summary ? computeRangeFlag(summary) : null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-default/70 bg-surface p-3">
      <div className={cn('flex size-8 items-center justify-center rounded-lg', iconClassName)}>
        <Icon icon={icon} size="sm" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xs text-text-tertiary">{label}</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-text-primary" dir="ltr">
            {latest.valueLabel}
          </p>
          {rangeFlag && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="warning" className="cursor-default gap-1">
                  {t(rangeFlag.direction === 'above' ? 'vitalAboveRange' : 'vitalBelowRange')}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{t('vitalRangeTooltip', { range: rangeFlag.range })}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="w-fit text-xs text-text-tertiary">
              {formatRelativeTime(recordedAt, locale, t('activeNow'))}
            </p>
          </TooltipTrigger>
          <TooltipContent>{formatExactDateTime(format, recordedAt)}</TooltipContent>
        </Tooltip>
        {/* Staleness (point 3): an explicit badge, never dimmed text -- the
            value above keeps full contrast regardless. */}
        {stale && (
          <Badge variant="warning" className="w-fit gap-1">
            {t('vitalOutdated', { relativeTime: formatRelativeTime(recordedAt, locale, t('activeNow')) })}
          </Badge>
        )}
        {summary && <TrendIndicator summary={summary} />}
      </div>
    </div>
  );
}
