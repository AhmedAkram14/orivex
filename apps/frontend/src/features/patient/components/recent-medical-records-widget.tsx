'use client';

import { ClipboardList, Stethoscope } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { usePatientMedicalRecords } from '@/features/patient/hooks/use-patient-medical-records';
import { CardHeaderLink, OverviewList, OverviewRow } from '@/features/patient/components/overview-list';
import { Alert } from '@/shared/ui/alert';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

const MAX_ITEMS = 3;

/**
 * The "My Health" dashboard's "Recent medical records" widget -- real
 * `GET /patients/me/medical-records` data (the source `/patient/records`
 * renders), newest few only. Each row shows the entry's own note (two lines
 * at most) and links to that entry on the Records page (`?highlight=<id>`
 * scrolls to and rings it). Only the real `visit` / `condition` entry types
 * the backend returns -- no invented categories; the type is the row's glyph
 * and the first word of its meta line.
 */
export function RecentMedicalRecordsWidget({ className }: { className?: string }) {
  const t = useTranslations('patient.dashboard');
  const tRecords = useTranslations('patient.records');
  const tType = useTranslations('patient.records.type');
  const format = useFormatter();
  const { data: entries, isLoading, isError, refetch } = usePatientMedicalRecords();

  const recent = [...(entries ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, MAX_ITEMS);

  return (
    <WidgetContainer
      title={<span className="text-h3">{t('recentMedicalRecordsTitle')}</span>}
      titleAs="h2"
      className={className}
      actions={<CardHeaderLink href="/patient/records" label={t('viewAll')} context={t('recentMedicalRecordsTitle')} />}
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
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : recent.length > 0 ? (
        <OverviewList>
          {recent.map((entry) => (
            <OverviewRow
              key={entry.id}
              href={`/patient/records?highlight=${entry.id}`}
              icon={entry.type === 'visit' ? Stethoscope : ClipboardList}
              title={entry.title}
              body={entry.description}
              meta={[tType(entry.type), format.dateTime(new Date(entry.date), { year: 'numeric', month: 'short', day: 'numeric' }), entry.doctorName]
                .filter(Boolean)
                .join(' · ')}
            />
          ))}
        </OverviewList>
      ) : (
        <EmptyState illustration="records-start" size="sm" title={t('recentMedicalRecordsEmptyTitle')} description={t('recentMedicalRecordsEmptyDescription')} />
      )}
    </WidgetContainer>
  );
}
