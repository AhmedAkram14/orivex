'use client';

import { CalendarClock, ClipboardList, HeartPulse, Pill } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { MedicalRecordEntry } from '@/features/patient/api/types';
import { usePatientDashboardSummary } from '@/features/patient/hooks/use-patient-dashboard-summary';
import { MetricStat, MetricStrip } from '@/shared/ui/metric-stat';

export interface RecordsSummaryProps {
  entries: MedicalRecordEntry[];
  entriesLoading: boolean;
  className?: string;
}

/**
 * The Medical Records page's compact "Health Summary" row — real counts
 * only. Visit/condition counts are derived from the same `MedicalRecordEntry[]`
 * the timeline already renders (no extra request); last-visit date and
 * active-prescription count reuse the real `/patients/me/dashboard-summary`
 * endpoint (the same source `HealthSummary` uses on the dashboard) rather
 * than re-deriving them, so both pages agree.
 *
 * Deliberately labeled "Conditions" (not "Active Conditions") -- the real
 * `HealthGraphNode` projection this page reads from has no active/resolved
 * status field, so this never implies a distinction the backend can't back.
 */
export function RecordsSummary({ entries, entriesLoading, className }: RecordsSummaryProps) {
  const t = useTranslations('patient.records.summary');
  const tDashboard = useTranslations('patient.dashboard');
  const format = useFormatter();
  const { data: dashboardSummary, isLoading: dashboardLoading } = usePatientDashboardSummary();

  const visitCount = entries.filter((entry) => entry.type === 'visit').length;
  const conditionCount = entries.filter((entry) => entry.type === 'condition').length;

  return (
    // The shared stat strip: one band, sideways snap-scroll on a phone, 2 then 4 columns as it widens.
    <MetricStrip className={className}>
      <MetricStat variant="inline" icon={ClipboardList} label={t('totalVisits')} value={String(visitCount)} loading={entriesLoading} />
      <MetricStat variant="inline" icon={HeartPulse} label={t('conditions')} value={String(conditionCount)} loading={entriesLoading} />
      <MetricStat
        variant="inline"
        icon={CalendarClock}
        label={tDashboard('lastVisit')}
        // A figure, never a sentence: with no visit yet the value is a dash and the sentence is the caption.
        value={
          dashboardSummary?.lastVisitAt
            ? format.dateTime(new Date(dashboardSummary.lastVisitAt), { month: 'short', day: 'numeric' })
            : '—'
        }
        helperText={dashboardSummary?.lastVisitAt ? undefined : tDashboard('noVisitsYet')}
        loading={dashboardLoading}
      />
      <MetricStat
        variant="inline"
        icon={Pill}
        label={tDashboard('activePrescriptionsTitle')}
        value={String(dashboardSummary?.activePrescriptionsCount ?? 0)}
        loading={dashboardLoading}
      />
    </MetricStrip>
  );
}
