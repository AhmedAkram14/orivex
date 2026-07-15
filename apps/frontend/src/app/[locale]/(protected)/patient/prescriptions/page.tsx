'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { MedicationList } from '@/features/patient/components/prescriptions/medication-list';
import { usePatientPrescriptions } from '@/features/patient/hooks/use-patient-prescriptions';
import { RequireRole } from '@/shared/auth/require-role';
import { Alert } from '@/shared/ui/alert';
import { Skeleton } from '@/shared/ui/skeleton';
import { Page } from '@/shared/ui/layout/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Patient Portal's Prescriptions page — Active/Previous tabs, each
 * rendering real (mocked) `Prescription` data via the reusable
 * `MedicationList`/`MedicationCard`. Honestly empty today since no Clinical
 * module is wired into the frontend yet.
 */
export default function PatientPrescriptionsPage() {
  const t = useTranslations('patient.prescriptions');
  const { data: prescriptions, isLoading, isError } = usePatientPrescriptions();

  const active = useMemo(() => (prescriptions ?? []).filter((p) => p.status === 'active'), [prescriptions]);
  const previous = useMemo(() => (prescriptions ?? []).filter((p) => p.status !== 'active'), [prescriptions]);

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} />

        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        {isLoading ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">{t('activeTab')}</TabsTrigger>
              <TabsTrigger value="previous">{t('previousTab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <MedicationList
                prescriptions={active}
                emptyTitle={t('activeEmptyTitle')}
                emptyDescription={t('activeEmptyDescription')}
              />
            </TabsContent>

            <TabsContent value="previous">
              <MedicationList
                prescriptions={previous}
                emptyTitle={t('previousEmptyTitle')}
                emptyDescription={t('previousEmptyDescription')}
              />
            </TabsContent>
          </Tabs>
        )}
      </Page>
    </RequireRole>
  );
}
