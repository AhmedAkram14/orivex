'use client';

import { Activity, Droplet, Scale } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { HealthVitalSummary, VitalType } from '@/features/patient/api/types';
import { DashboardGrid } from '@/shared/ui/layout/page';
import { VitalTrendCard } from '@/shared/ui/health/vital-trend-card';

const iconByType: Record<VitalType, LucideIcon> = {
  weight: Scale,
  'blood-pressure': Activity,
  'blood-sugar': Droplet,
};

export interface HealthVitalsGridProps {
  vitals: HealthVitalSummary[];
  loading?: boolean;
}

/** Maps the `/patient/health-dashboard` response into the three vital-sign trend cards (Weight/Blood Pressure/Blood Sugar), milestone 6's reusable health widgets. */
export function HealthVitalsGrid({ vitals, loading = false }: HealthVitalsGridProps) {
  const t = useTranslations('patient.health');
  const format = useFormatter();

  const vitalTypes: VitalType[] = ['weight', 'blood-pressure', 'blood-sugar'];

  return (
    <DashboardGrid columns={3}>
      {vitalTypes.map((type) => {
        const summary = vitals.find((vital) => vital.type === type);
        return (
          <VitalTrendCard
            key={type}
            icon={iconByType[type]}
            title={t(`vitals.${type}.title`)}
            latestValueLabel={summary?.latest?.valueLabel}
            latestDateLabel={
              summary?.latest
                ? format.dateTime(new Date(summary.latest.recordedAt), {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : undefined
            }
            trendValues={(summary?.readings ?? []).map((reading) => reading.value)}
            trendLabel={t(`vitals.${type}.trendLabel`)}
            emptyTitle={t(`vitals.${type}.emptyTitle`)}
            emptyDescription={t(`vitals.${type}.emptyDescription`)}
            loading={loading}
          />
        );
      })}
    </DashboardGrid>
  );
}
