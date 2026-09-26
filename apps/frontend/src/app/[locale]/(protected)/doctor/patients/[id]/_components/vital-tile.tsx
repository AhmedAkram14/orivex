'use client';

import type { LucideIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { DoctorPatientChartVitalSummary } from '@/features/doctor/api/types';
import { vitalBandFor, vitalStatusFor } from '@/shared/lib/health/vital-reference-ranges';
import { formatRelativeTime } from '@/shared/lib/date/relative-time';
import { Badge } from '@/shared/ui/badge';
import { VitalCard } from '@/shared/ui/health/vital-card';
import { VITAL_STALE_AFTER_DAYS, isStale } from '../_lib/vital-staleness';

export interface VitalTileProps {
  icon: LucideIcon;
  /** Kept for call-site compatibility; the redesigned card has no pastel icon tile. */
  iconClassName?: string;
  label: string;
  summary: DoctorPatientChartVitalSummary | undefined;
  notOnRecordLabel: string;
}

/**
 * A patient's vital on the doctor's chart -- the shared compact `VitalCard`:
 * latest value and date, the recent readings as a neutral line with a shaded
 * normal-range band (BP and glucose only), and a non-diagnostic status chip
 * ("In range" / "Above target" / "Below target"). Staleness stays an explicit
 * badge, never dimmed text. "Recorded by" is not on this DTO, so it is not
 * shown (see the redesign report).
 */
export function VitalTile({ icon, label, summary, notOnRecordLabel }: VitalTileProps) {
  const t = useTranslations('publicPatient');
  const locale = useLocale();
  const latest = summary?.latest;
  const type = summary?.type;
  const stale = latest ? isStale(new Date(latest.recordedAt), VITAL_STALE_AFTER_DAYS) : false;

  return (
    <VitalCard
      size="compact"
      icon={icon}
      title={label}
      latest={latest ? { valueLabel: latest.valueLabel, recordedAt: latest.recordedAt } : undefined}
      readings={(summary?.readings ?? []).map((reading) => ({
        value: reading.value,
        recordedAt: reading.recordedAt,
        valueLabel: reading.valueLabel,
      }))}
      band={type ? vitalBandFor(type) : undefined}
      status={latest && type ? vitalStatusFor(type, latest.value, latest.diastolicValue) : null}
      trendLabel={label}
      emptyTitle={notOnRecordLabel}
      emptyDescription=""
      note={
        latest && stale ? (
          <Badge variant="warning" className="mt-1 w-fit">
            {t('vitalOutdated', { relativeTime: formatRelativeTime(new Date(latest.recordedAt), locale, t('activeNow')) })}
          </Badge>
        ) : undefined
      }
    />
  );
}
