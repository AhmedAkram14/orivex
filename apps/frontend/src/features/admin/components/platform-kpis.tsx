'use client';

import { Building2, Stethoscope, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePlatformKpis } from '@/features/admin/hooks/use-platform-kpis';
import { Alert } from '@/shared/ui/alert';
import { DashboardGrid } from '@/shared/ui/layout/page';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';

/**
 * The Admin Overview's KPI row — real counts from `/admin/kpis`. Only
 * identity-owned counts (active doctors/patients, hospital count) this
 * stage; appointment-volume/revenue KPIs are deferred to Stage 9 (Reporting
 * & Analytics) per GetPlatformKpisUseCase's own comment on the backend.
 */
export function PlatformKpis() {
  const t = useTranslations('admin.overview');
  const { data, isLoading, isError } = usePlatformKpis();

  if (isError) {
    return <Alert variant="danger">{t('kpisLoadError')}</Alert>;
  }

  return (
    <DashboardGrid columns={3}>
      <LinkableStatCard
        icon={Stethoscope}
        label={t('activeDoctorCount')}
        value={String(data?.activeDoctorCount ?? 0)}
        loading={isLoading}
        href="/admin/users"
      />
      <LinkableStatCard
        icon={Users}
        label={t('activePatientCount')}
        value={String(data?.activePatientCount ?? 0)}
        loading={isLoading}
        href="/admin/users"
      />
      <LinkableStatCard
        icon={Building2}
        label={t('hospitalCount')}
        value={String(data?.hospitalCount ?? 0)}
        loading={isLoading}
        href="/admin/hospitals"
      />
    </DashboardGrid>
  );
}
