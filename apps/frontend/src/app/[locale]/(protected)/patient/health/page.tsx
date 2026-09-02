'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { HealthVitalsGrid } from '@/features/patient/components/health/health-vitals-grid';
import { usePatientHealthDashboard } from '@/features/patient/hooks/use-patient-health-dashboard';
import { RequireRole } from '@/shared/auth/require-role';
import { Alert } from '@/shared/ui/alert';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Patient Portal's Health Dashboard — Weight, Blood Pressure, and Blood
 * Sugar vitals, each a `VitalTrendCard` with a real `TrendChart` sparkline
 * over recent history. Backed by the real `GET /patients/me/health-dashboard`
 * endpoint (ClinicalModule's PatientDashboardController) -- real, doctor-
 * authored VitalReading rows recorded via RecordVitalReadingUseCase during a
 * consultation, an honest empty grid only for a patient nothing has ever
 * been recorded for.
 */
export default function PatientHealthDashboardPage() {
  const t = useTranslations('patient.health');
  const { data: vitals, isLoading, isError } = usePatientHealthDashboard();

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} />

        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        <HealthVitalsGrid vitals={vitals ?? []} loading={isLoading} />
      </Page>
    </RequireRole>
  );
}
