'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { usePatientMedicalRecords } from '@/features/patient/hooks/use-patient-medical-records';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Link } from '@/shared/i18n/navigation';
import { Skeleton } from '@/shared/ui/skeleton';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

const MAX_ITEMS = 3;

/**
 * The "My Health" dashboard's "Recent medical records" widget -- real
 * `GET /patients/me/medical-records` data (the source `/patient/records`
 * renders), newest few only. Each row shows a one-line preview of the
 * entry's own note and links to that entry on the Records page
 * (`?highlight=<id>` scrolls to and rings it). Only the real `visit` /
 * `condition` entry types the backend returns -- no invented categories.
 */
export function RecentMedicalRecordsWidget() {
  const t = useTranslations('patient.dashboard');
  const tRecords = useTranslations('patient.records');
  const tType = useTranslations('patient.records.type');
  const format = useFormatter();
  const { data: entries, isLoading, isError, refetch } = usePatientMedicalRecords();

  const recent = [...(entries ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, MAX_ITEMS);

  return (
    <WidgetContainer
      title={<span className="text-lg font-semibold">{t('recentMedicalRecordsTitle')}</span>}
      titleAs="h2"
      className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/patient/records">{t('viewAllRecords')}</Link>
        </Button>
      }
    >
      {isError ? (
        <Alert variant="danger">
          <span>{tRecords('loadError')}</span>{' '}
          <button type="button" className="font-medium underline" onClick={() => refetch()}>
            {t('retry')}
          </button>
        </Alert>
      ) : isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : recent.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border-default">
          {recent.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/patient/records?highlight=${entry.id}`}
                className="flex flex-col gap-1 rounded-md py-3 transition-colors hover:bg-secondary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{entry.title}</span>
                  <Badge variant={entry.type === 'visit' ? 'info' : 'neutral'}>{tType(entry.type)}</Badge>
                </span>
                {entry.description && <span className="line-clamp-1 text-sm text-text-secondary">{entry.description}</span>}
                <span className="text-xs text-text-tertiary">
                  {format.dateTime(new Date(entry.date), { year: 'numeric', month: 'short', day: 'numeric' })}
                  {entry.doctorName && <span> · {entry.doctorName}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState className="py-6" title={t('recentMedicalRecordsEmptyTitle')} description={t('recentMedicalRecordsEmptyDescription')} />
      )}
    </WidgetContainer>
  );
}
