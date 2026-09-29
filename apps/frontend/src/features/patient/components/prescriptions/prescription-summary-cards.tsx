'use client';

import { CalendarClock, Files, Pill, Stethoscope } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { Prescription } from '@/features/patient/api/types';
import { MetricStat, MetricStrip } from '@/shared/ui/metric-stat';

export interface PrescriptionSummaryCardsProps {
  prescriptions: Prescription[];
  loading: boolean;
  className?: string;
}

/**
 * The Prescriptions page's KPI row — every value is derived client-side
 * from the same real `Prescription[]` the Active/Previous tabs already
 * render (no extra request, no new backend endpoint). There is no "refill"
 * concept in the real domain, so no such KPI is ever shown here.
 */
export function PrescriptionSummaryCards({ prescriptions, loading, className }: PrescriptionSummaryCardsProps) {
  const t = useTranslations('patient.prescriptions.summary');
  const format = useFormatter();

  const activeCount = prescriptions.filter((p) => p.status === 'active').length;
  const distinctDoctorCount = new Set(prescriptions.map((p) => p.prescribedBy)).size;
  const lastPrescribedAt = prescriptions.reduce<string | undefined>((latest, p) => {
    if (!latest || new Date(p.prescribedAt).getTime() > new Date(latest).getTime()) return p.prescribedAt;
    return latest;
  }, undefined);

  return (
    // The shared stat strip: one band, sideways snap-scroll on a phone, 2 then 4 columns as it widens.
    <MetricStrip className={className}>
      <MetricStat variant="inline" icon={Pill} label={t('activePrescriptions')} value={String(activeCount)} helperText={t('currentlyTaking')} loading={loading} />
      <MetricStat
        variant="inline"
        icon={CalendarClock}
        label={t('lastPrescribed')}
        value={
          lastPrescribedAt
            ? format.dateTime(new Date(lastPrescribedAt), { year: 'numeric', month: 'short', day: 'numeric' })
            : t('none')
        }
        helperText={t('lastPrescribedSublabel')}
        loading={loading}
      />
      <MetricStat variant="inline" icon={Stethoscope} label={t('prescribedBy')} value={String(distinctDoctorCount)} helperText={t('differentDoctors')} loading={loading} />
      <MetricStat variant="inline" icon={Files} label={t('totalPrescriptions')} value={String(prescriptions.length)} helperText={t('allTime')} loading={loading} />
    </MetricStrip>
  );
}
