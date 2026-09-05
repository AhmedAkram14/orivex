'use client';

import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { PrescriptionList } from '@/features/patient/components/prescriptions/prescription-list';
import { PrescriptionSidebar } from '@/features/patient/components/prescriptions/prescription-sidebar';
import { PrescriptionSummaryCards } from '@/features/patient/components/prescriptions/prescription-summary-cards';
import { usePatientPrescriptions } from '@/features/patient/hooks/use-patient-prescriptions';
import { RequireRole } from '@/shared/auth/require-role';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { Page } from '@/shared/ui/layout/page';
import { Section } from '@/shared/ui/layout/section';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Patient Portal's Prescriptions page — Prescriptions Redesign
 * (2026-09-05): a real-data KPI row, large horizontal `PrescriptionCard`s
 * (replacing the compact `MedicationCard` list only on this page), and a
 * supporting sidebar of informational cards, above the same real
 * Active/Previous `Tabs` behavior as before. Still backed by the single
 * `usePatientPrescriptions()` query -- this redesign changes layout and
 * card composition only, never the data source.
 */
export default function PatientPrescriptionsPage() {
  const t = useTranslations('patient.prescriptions');
  const { data: prescriptions, isLoading, isError } = usePatientPrescriptions();

  const all = useMemo(() => prescriptions ?? [], [prescriptions]);
  const active = useMemo(() => all.filter((p) => p.status === 'active'), [all]);
  const previous = useMemo(() => all.filter((p) => p.status !== 'active'), [all]);

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader
          breadcrumbs={<AppBreadcrumbs />}
          title={t('title')}
          description={t('subtitle')}
          actions={
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Icon icon={Printer} size="sm" />
              {t('printList')}
            </Button>
          }
        />

        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        {isLoading ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">{t('activeTab')}</TabsTrigger>
              <TabsTrigger value="previous">{t('previousTab')}</TabsTrigger>
            </TabsList>

            <PrescriptionSummaryCards prescriptions={all} loading={isLoading} className="mt-4" />

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TabsContent value="active" className="mt-0">
                  <Section title={t('activeHeading')}>
                    <PrescriptionList
                      prescriptions={active}
                      emptyTitle={t('activeEmptyTitle')}
                      emptyDescription={t('activeEmptyDescription')}
                      emptyActions={
                        <>
                          <Button asChild variant="outline">
                            <Link href="/patient/doctors">{t('browseDoctors')}</Link>
                          </Button>
                          <Button asChild>
                            <Link href="/patient/appointments/book">{t('bookAppointment')}</Link>
                          </Button>
                        </>
                      }
                    />
                  </Section>
                </TabsContent>

                <TabsContent value="previous" className="mt-0">
                  <Section title={t('previousHeading')}>
                    <PrescriptionList
                      prescriptions={previous}
                      emptyTitle={t('previousEmptyTitle')}
                      emptyDescription={t('previousEmptyDescription')}
                    />
                  </Section>
                </TabsContent>
              </div>

              <div className="print:hidden">
                <PrescriptionSidebar />
              </div>
            </div>
          </Tabs>
        )}
      </Page>
    </RequireRole>
  );
}
