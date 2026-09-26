'use client';

import { Activity, Droplet, Scale } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { HealthVitalSummary, VitalType } from '@/features/patient/api/types';
import { evaluateVital, VITAL_REFERENCE_BANDS } from '@/shared/lib/health/vital-reference-ranges';
import { VitalCard } from '@/shared/ui/health/vital-card';
import { MetricGrid } from '@/shared/ui/metric-stat';
import { SegmentedControl } from '@/shared/ui/segmented-control';

const iconByType: Record<VitalType, LucideIcon> = {
  weight: Scale,
  'blood-pressure': Activity,
  'blood-sugar': Droplet,
};

const RANGES = [
  { key: 'range7', days: 7 },
  { key: 'range30', days: 30 },
  { key: 'range90', days: 90 },
  { key: 'rangeAll', days: null },
] as const;

export interface HealthVitalsGridProps {
  vitals: HealthVitalSummary[];
  loading?: boolean;
}

/** Maps the `/patient/health-dashboard` response into the three `VitalCard`s (Weight / Blood Pressure / Blood Sugar) with a shared time-range toggle. The latest reading and its status chip always come from the newest reading overall, not the selected window. */
export function HealthVitalsGrid({ vitals, loading = false }: HealthVitalsGridProps) {
  const t = useTranslations('patient.health');
  const tDs = useTranslations('ds.vital');
  const [rangeIndex, setRangeIndex] = useState(3);
  const range = RANGES[rangeIndex];

  const vitalTypes: VitalType[] = ['weight', 'blood-pressure', 'blood-sugar'];
  const cutoff = range.days === null ? 0 : Date.now() - range.days * 86_400_000;

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        ariaLabel={tDs('rangeLabel')}
        options={RANGES.map((item) => ({ value: item.key, label: tDs(item.key) }))}
        value={range.key}
        onChange={(key) => setRangeIndex(RANGES.findIndex((item) => item.key === key))}
      />

      <MetricGrid columns={3}>
        {vitalTypes.map((type) => {
          const summary = vitals.find((vital) => vital.type === type);
          const latest = summary?.latest;
          const readings = (summary?.readings ?? []).filter((reading) => new Date(reading.recordedAt).getTime() >= cutoff);
          return (
            <VitalCard
              key={type}
              icon={iconByType[type]}
              title={t(`vitals.${type}.title`)}
              latest={latest ? { valueLabel: latest.valueLabel, recordedAt: latest.recordedAt } : undefined}
              readings={readings.map((reading) => ({ value: reading.value, recordedAt: reading.recordedAt, valueLabel: reading.valueLabel }))}
              band={type === 'weight' ? undefined : VITAL_REFERENCE_BANDS[type]}
              status={latest ? evaluateVital(type, latest.value, latest.diastolicValue) : null}
              trendLabel={t(`vitals.${type}.trendLabel`)}
              emptyTitle={t(`vitals.${type}.emptyTitle`)}
              emptyDescription={t(`vitals.${type}.emptyDescription`)}
              loading={loading}
            />
          );
        })}
      </MetricGrid>
    </div>
  );
}
