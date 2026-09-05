'use client';

import { ChevronRight, FileStack } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { ActiveConditionsPanel } from '@/features/patient/components/records/active-conditions-panel';
import { ClinicalDocumentUpload } from '@/features/patient/components/records/clinical-document-upload';
import { LabImagingPlaceholders } from '@/features/patient/components/records/lab-imaging-placeholders';
import { MedicalRecordsTimeline } from '@/features/patient/components/records/medical-records-timeline';
import { RecentPrescriptionsPanel } from '@/features/patient/components/records/recent-prescriptions-panel';
import { RecordsSummary } from '@/features/patient/components/records/records-summary';
import { usePatientMedicalRecords } from '@/features/patient/hooks/use-patient-medical-records';
import type { MedicalRecordEntryType } from '@/features/patient/api/types';
import { RequireRole } from '@/shared/auth/require-role';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { FilterTabs } from '@/shared/ui/filter-tabs';
import { Skeleton } from '@/shared/ui/skeleton';
import { Page } from '@/shared/ui/layout/page';
import { Section } from '@/shared/ui/layout/section';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

type RecordFilter = 'all' | MedicalRecordEntryType;

/**
 * The Patient Portal's Medical Records page — Medical Records Redesign
 * (2026-09-03): a two-column clinical-record composition (`Clinical
 * Timeline` as the ~65-70% main column, `Conditions` / `Recent
 * Prescriptions` / `Clinical Documents` / lab-imaging placeholders as the
 * ~30-35% supporting column) above a compact real-data summary row,
 * replacing the previous single stacked-Section layout. Every widget still
 * composes the same real hooks/endpoints as before (`GET
 * /patients/me/medical-records`, `/prescriptions`, `/dashboard-summary`,
 * the upload-intent flow) -- this redesign changes layout, hierarchy, and
 * card composition only, never the data sources.
 */
export default function PatientMedicalRecordsPage() {
  const t = useTranslations('patient.records');
  const { data: entries, isLoading, isError } = usePatientMedicalRecords();
  const [filter, setFilter] = useState<RecordFilter>('all');

  const allEntries = useMemo(() => entries ?? [], [entries]);
  const filtered = useMemo(() => {
    return filter === 'all' ? allEntries : allEntries.filter((entry) => entry.type === filter);
  }, [allEntries, filter]);

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />

        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        <RecordsSummary entries={allEntries} entriesLoading={isLoading} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Section title={t('timelineTitle')}>
              {isLoading ? (
                <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <FilterTabs
                    value={filter}
                    onChange={setFilter}
                    options={[
                      { value: 'all', label: t('filters.all') },
                      { value: 'visit', label: t('filters.visit') },
                      { value: 'condition', label: t('filters.condition') },
                    ]}
                  />
                  <MedicalRecordsTimeline entries={filtered} />
                </div>
              )}
            </Section>
          </div>

          <div className="flex flex-col gap-6">
            <Section title={t('conditionsTitle')}>
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <ActiveConditionsPanel entries={allEntries} />
              )}
            </Section>

            <Section
              title={t('recentPrescriptionsTitle')}
              actions={
                <Link
                  href="/patient/prescriptions"
                  className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                >
                  {t('viewAllPrescriptions')}
                  <Icon icon={ChevronRight} size="xs" flipRtl />
                </Link>
              }
            >
              <RecentPrescriptionsPanel />
            </Section>

            <Section title={t('clinicalUpload.title')} description={t('clinicalUpload.description')}>
              <ClinicalDocumentUpload />
            </Section>

            <Section
              title={t('labImagingTitle')}
              actions={<Icon icon={FileStack} size="sm" className="text-text-tertiary" />}
            >
              <LabImagingPlaceholders />
            </Section>
          </div>
        </div>
      </Page>
    </RequireRole>
  );
}
