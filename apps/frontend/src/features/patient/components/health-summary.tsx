'use client';

import { CalendarClock, ChevronRight, History, Pill, type LucideIcon } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { usePatientDashboardSummary } from '@/features/patient/hooks/use-patient-dashboard-summary';
import { Alert } from '@/shared/ui/alert';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';

export interface HealthSummaryProps {
  /** 'row' (default, unchanged) is a 3-column grid; 'column' stacks the three tiles vertically -- for placing this summary in a narrow sidebar column (e.g. beside `NextAppointmentCard`) where the grid's own `sm:`/`lg:` breakpoints would otherwise trigger from the viewport width, not the actual (narrow) column width, and squeeze the tiles. */
  layout?: 'row' | 'column';
  className?: string;
}

interface SummaryTileProps {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string;
  loading: boolean;
  href?: string;
  viewLabel: string;
}

/** One Health Summary tile — real value, a distinctly colored icon (per-tile, so the row/stack reads at a glance instead of three identical blue tiles), and an optional "View all"/"View details" link to the real page that value is a preview of. */
function SummaryTile({ icon, iconClassName, label, value, loading, href, viewLabel }: SummaryTileProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-default bg-surface p-4">
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', iconClassName)}>
        <Icon icon={icon} size="md" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-xs text-text-tertiary">{label}</p>
        {loading ? <Skeleton className="h-6 w-16" /> : <p className="text-xl font-semibold text-text-primary">{value}</p>}
        {href && !loading && (
          <Link
            href={href}
            className="mt-1 inline-flex w-fit items-center gap-0.5 text-xs font-medium text-primary hover:underline"
          >
            {viewLabel}
            <Icon icon={ChevronRight} size="xs" flipRtl />
          </Link>
        )}
      </div>
    </div>
  );
}

/** The Patient Portal's "Health Summary" — real counts from the real `/patients/me/dashboard-summary` endpoint, never fabricated numbers. */
export function HealthSummary({ layout = 'row', className }: HealthSummaryProps) {
  const t = useTranslations('patient.dashboard');
  const format = useFormatter();
  const { data, isLoading, isError } = usePatientDashboardSummary();

  if (isError) {
    return <Alert variant="danger">{t('summaryLoadError')}</Alert>;
  }

  const tiles = (
    <>
      <SummaryTile
        icon={CalendarClock}
        iconClassName="bg-primary-subtle text-primary"
        label={t('upcomingAppointmentsTitle')}
        value={String(data?.upcomingAppointmentsCount ?? 0)}
        loading={isLoading}
        href="/patient/appointments"
        viewLabel={t('viewAllAppointments')}
      />
      <SummaryTile
        icon={Pill}
        iconClassName="bg-success-subtle text-success"
        label={t('activePrescriptionsTitle')}
        value={String(data?.activePrescriptionsCount ?? 0)}
        loading={isLoading}
        href="/patient/prescriptions"
        viewLabel={t('viewPrescriptionsAction')}
      />
      <SummaryTile
        icon={History}
        iconClassName="bg-warning-subtle text-warning"
        label={t('lastVisit')}
        value={data?.lastVisitAt ? format.dateTime(new Date(data.lastVisitAt), { year: 'numeric', month: 'short', day: 'numeric' }) : t('noVisitsYet')}
        loading={isLoading}
        href="/patient/records"
        viewLabel={t('viewDetailsAction')}
      />
    </>
  );

  if (layout === 'column') {
    return <div className={cn('flex h-full flex-col gap-3', className)}>{tiles}</div>;
  }

  return <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-3', className)}>{tiles}</div>;
}
