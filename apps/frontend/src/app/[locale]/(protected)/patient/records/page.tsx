'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { ClinicalDocumentUpload } from '@/features/patient/components/records/clinical-document-upload';
import { LabImagingPlaceholders } from '@/features/patient/components/records/lab-imaging-placeholders';
import { MedicalRecordsTimeline } from '@/features/patient/components/records/medical-records-timeline';
import { usePatientMedicalRecords } from '@/features/patient/hooks/use-patient-medical-records';
import type { MedicalRecordEntryType } from '@/features/patient/api/types';
import { RequireRole } from '@/shared/auth/require-role';
import { Alert } from '@/shared/ui/alert';
import { FilterTabs } from '@/shared/ui/filter-tabs';
import { Skeleton } from '@/shared/ui/skeleton';
import { Page } from '@/shared/ui/layout/page';
import { Section } from '@/shared/ui/layout/section';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

type RecordFilter = 'all' | MedicalRecordEntryType;

/**
 * The Patient Portal's Medical Records page — a chronological timeline
 * (visits/conditions), type filters, and honestly not-yet-available Lab
 * Results/Imaging placeholders. Backed by the real
 * GET /patients/me/medical-records endpoint.
 */
export default function PatientMedicalRecordsPage() {
  const t = useTranslations('patient.records');
  const { data: entries, isLoading, isError } = usePatientMedicalRecords();
  const [filter, setFilter] = useState<RecordFilter>('all');

  const filtered = useMemo(() => {
    const all = entries ?? [];
    return filter === 'all' ? all : all.filter((entry) => entry.type === filter);
  }, [entries, filter]);

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} />

        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        <Section title={t('timelineTitle')}>
          {isLoading ? (
            <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
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

        <Section title={t('clinicalUpload.title')}>
          <ClinicalDocumentUpload />
        </Section>

        <LabImagingPlaceholders />
      </Page>
    </RequireRole>
  );
}
