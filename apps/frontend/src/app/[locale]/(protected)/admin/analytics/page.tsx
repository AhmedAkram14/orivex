'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { AnalyticsFiltersBar } from '@/features/reporting/components/analytics-filters-bar';
import { DashboardKpiGrid } from '@/features/reporting/components/dashboard-kpi-grid';
import { useAnalyticsPreferences } from '@/features/reporting/hooks/use-analytics-preferences';
import { ChartSkeleton } from '@/shared/ui/charts/chart-skeleton';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

// Each panel renders at least one Recharts bundle -- next/dynamic + ssr:false
// keeps that bundle out of the initial page load and out of server rendering
// entirely (Recharts needs a real DOM), matching this app's existing
// client-only-widget convention.
const AppointmentAnalyticsPanel = dynamic(
  () => import('@/features/reporting/components/appointment-analytics-panel').then((mod) => mod.AppointmentAnalyticsPanel),
  { ssr: false, loading: () => <ChartSkeleton height={400} /> },
);
const DoctorLeaderboardPanel = dynamic(
  () => import('@/features/reporting/components/doctor-leaderboard-panel').then((mod) => mod.DoctorLeaderboardPanel),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> },
);
const PatientAnalyticsPanel = dynamic(
  () => import('@/features/reporting/components/patient-analytics-panel').then((mod) => mod.PatientAnalyticsPanel),
  { ssr: false, loading: () => <ChartSkeleton height={400} /> },
);
const PaymentAnalyticsPanel = dynamic(
  () => import('@/features/reporting/components/payment-analytics-panel').then((mod) => mod.PaymentAnalyticsPanel),
  { ssr: false, loading: () => <ChartSkeleton height={200} /> },
);
const TelemedicineAnalyticsPanel = dynamic(
  () => import('@/features/reporting/components/telemedicine-analytics-panel').then((mod) => mod.TelemedicineAnalyticsPanel),
  { ssr: false, loading: () => <ChartSkeleton height={200} /> },
);
const VerificationAnalyticsPanel = dynamic(
  () => import('@/features/reporting/components/verification-analytics-panel').then((mod) => mod.VerificationAnalyticsPanel),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> },
);
const NotificationAnalyticsPanel = dynamic(
  () => import('@/features/reporting/components/notification-analytics-panel').then((mod) => mod.NotificationAnalyticsPanel),
  { ssr: false, loading: () => <ChartSkeleton height={200} /> },
);

/**
 * The Admin Workspace's Analytics Dashboard -- ORIVEX Roadmap 2.0's Stage 9
 * (Reporting & Analytics), the home `GetPlatformKpisUseCase`'s own comment
 * deferred appointment-count/revenue KPIs to. Every section below is a real
 * ReportingModule endpoint; filters/compare/refresh-interval are owned by
 * `useAnalyticsPreferences` and shared across every panel.
 */
export default function AdminAnalyticsPage() {
  const t = useTranslations('admin.analytics');
  const { filter, refreshInterval, refetchIntervalMs, updatePreferences } = useAnalyticsPreferences();

  return (
    <RequireRole roles={['super_admin']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />
        <AnalyticsFiltersBar preferences={{ ...filter, refreshInterval }} onChange={updatePreferences} />
        <DashboardKpiGrid filter={filter} refetchIntervalMs={refetchIntervalMs} />
        <AppointmentAnalyticsPanel filter={filter} refetchIntervalMs={refetchIntervalMs} />
        <DoctorLeaderboardPanel filter={filter} refetchIntervalMs={refetchIntervalMs} />
        <PatientAnalyticsPanel filter={filter} refetchIntervalMs={refetchIntervalMs} />
        <PaymentAnalyticsPanel filter={filter} refetchIntervalMs={refetchIntervalMs} />
        <TelemedicineAnalyticsPanel filter={filter} refetchIntervalMs={refetchIntervalMs} />
        <VerificationAnalyticsPanel filter={filter} refetchIntervalMs={refetchIntervalMs} />
        <NotificationAnalyticsPanel filter={filter} refetchIntervalMs={refetchIntervalMs} />
      </Page>
    </RequireRole>
  );
}
