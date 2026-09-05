'use client';

import { CalendarClock, ClipboardList, HeartPulse, Pill, type LucideIcon } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { MedicalRecordEntry } from '@/features/patient/api/types';
import { usePatientDashboardSummary } from '@/features/patient/hooks/use-patient-dashboard-summary';
import { Icon } from '@/shared/icons/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';

export interface RecordsSummaryProps {
  entries: MedicalRecordEntry[];
  entriesLoading: boolean;
  className?: string;
}

interface SummaryTileProps {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string;
  loading: boolean;
}

function SummaryTile({ icon, iconClassName, label, value, loading }: SummaryTileProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-default bg-surface p-4">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', iconClassName)}>
        <Icon icon={icon} size="md" />
      </span>
      <div className="flex flex-col gap-0.5">
        <p className="text-xs text-text-tertiary">{label}</p>
        {loading ? <Skeleton className="h-6 w-14" /> : <p className="text-xl font-semibold text-text-primary">{value}</p>}
      </div>
    </div>
  );
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
    <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>
      <SummaryTile
        icon={ClipboardList}
        iconClassName="bg-info-subtle text-info-emphasis"
        label={t('totalVisits')}
        value={String(visitCount)}
        loading={entriesLoading}
      />
      <SummaryTile
        icon={HeartPulse}
        iconClassName="bg-primary-subtle text-primary-emphasis"
        label={t('conditions')}
        value={String(conditionCount)}
        loading={entriesLoading}
      />
      <SummaryTile
        icon={CalendarClock}
        iconClassName="bg-warning-subtle text-warning-emphasis"
        label={tDashboard('lastVisit')}
        value={
          dashboardSummary?.lastVisitAt
            ? format.dateTime(new Date(dashboardSummary.lastVisitAt), { month: 'short', day: 'numeric' })
            : tDashboard('noVisitsYet')
        }
        loading={dashboardLoading}
      />
      <SummaryTile
        icon={Pill}
        iconClassName="bg-success-subtle text-success-emphasis"
        label={tDashboard('activePrescriptionsTitle')}
        value={String(dashboardSummary?.activePrescriptionsCount ?? 0)}
        loading={dashboardLoading}
      />
    </div>
  );
}
