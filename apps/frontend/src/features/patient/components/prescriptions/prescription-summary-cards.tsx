'use client';

import { CalendarClock, Pill, Stethoscope, type LucideIcon } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { Prescription } from '@/features/patient/api/types';
import { Icon } from '@/shared/icons/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';

export interface PrescriptionSummaryCardsProps {
  prescriptions: Prescription[];
  loading: boolean;
  className?: string;
}

interface SummaryTileProps {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string;
  sublabel: string;
  loading: boolean;
}

function SummaryTile({ icon, iconClassName, label, value, sublabel, loading }: SummaryTileProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-default bg-surface p-4">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', iconClassName)}>
        <Icon icon={icon} size="md" />
      </span>
      <div className="flex flex-col gap-0.5">
        <p className="text-xs text-text-tertiary">{label}</p>
        {loading ? (
          <Skeleton className="h-6 w-16" />
        ) : (
          <p className="text-xl font-semibold text-text-primary">{value}</p>
        )}
        <p className="text-xs text-text-tertiary">{sublabel}</p>
      </div>
    </div>
  );
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
    <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>
      <SummaryTile
        icon={Pill}
        iconClassName="bg-success-subtle text-success-emphasis"
        label={t('activePrescriptions')}
        value={String(activeCount)}
        sublabel={t('currentlyTaking')}
        loading={loading}
      />
      <SummaryTile
        icon={CalendarClock}
        iconClassName="bg-info-subtle text-info-emphasis"
        label={t('lastPrescribed')}
        value={
          lastPrescribedAt
            ? format.dateTime(new Date(lastPrescribedAt), { year: 'numeric', month: 'short', day: 'numeric' })
            : t('none')
        }
        sublabel={t('lastPrescribedSublabel')}
        loading={loading}
      />
      <SummaryTile
        icon={Stethoscope}
        iconClassName="bg-primary-subtle text-primary-emphasis"
        label={t('prescribedBy')}
        value={String(distinctDoctorCount)}
        sublabel={t('differentDoctors')}
        loading={loading}
      />
      <SummaryTile
        icon={Pill}
        iconClassName="bg-warning-subtle text-warning-emphasis"
        label={t('totalPrescriptions')}
        value={String(prescriptions.length)}
        sublabel={t('allTime')}
        loading={loading}
      />
    </div>
  );
}
