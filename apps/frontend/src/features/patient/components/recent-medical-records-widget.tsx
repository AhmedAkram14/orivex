'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { usePatientMedicalRecords } from '@/features/patient/hooks/use-patient-medical-records';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Link } from '@/shared/i18n/navigation';
import { Skeleton } from '@/shared/ui/skeleton';
import { RecordTimelineEntry } from '@/shared/ui/timeline/record-timeline-entry';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

const MAX_ITEMS = 3;

/**
 * The redesigned "My Health" dashboard's "Recent medical records" widget —
 * real `GET /patients/me/medical-records` data (the same source
 * `/patient/records`'s full timeline renders), newest few only, reusing
 * `RecordTimelineEntry` rather than a bespoke row shape. Only ever the real
 * `visit`/`condition` entry types the backend actually returns -- no
 * fabricated "Lab Report"/"Prescription"/"Note" categories the domain
 * doesn't have.
 */
export function RecentMedicalRecordsWidget() {
  const t = useTranslations('patient.dashboard');
  const tRecords = useTranslations('patient.records');
  const tType = useTranslations('patient.records.type');
  const format = useFormatter();
  const { data: entries, isLoading, isError } = usePatientMedicalRecords();

  const recent = [...(entries ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, MAX_ITEMS);

  return (
    <WidgetContainer
      title={t('recentMedicalRecordsTitle')}
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/patient/records">{t('viewAllRecords')}</Link>
        </Button>
      }
    >
      {isError ? (
        <Alert variant="danger">{tRecords('loadError')}</Alert>
      ) : isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : recent.length > 0 ? (
        <ol className="flex flex-col">
          {recent.map((entry, index) => (
            <li key={entry.id}>
              <RecordTimelineEntry
                dateLabel={format.dateTime(new Date(entry.date), { year: 'numeric', month: 'short', day: 'numeric' })}
                type={entry.type}
                typeLabel={tType(entry.type)}
                title={entry.title}
                doctorName={entry.doctorName}
                isLast={index === recent.length - 1}
              />
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState className="py-6" title={t('recentMedicalRecordsEmptyTitle')} description={t('recentMedicalRecordsEmptyDescription')} />
      )}
    </WidgetContainer>
  );
}
