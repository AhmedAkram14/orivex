'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { DoctorEarningsSummary } from '@/features/payment/components/doctor-earnings-summary';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Doctor Workspace's "Earnings" page (I2 -- docs/01-prd.md L15, L94
 * §2.10) -- real per-cycle earnings and commission, derived on demand from
 * the existing PaymentTransaction ledger, never a fabricated payout.
 */
export default function DoctorEarningsPage() {
  const t = useTranslations('doctor.earnings');

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />
        <DoctorEarningsSummary />
      </Page>
    </RequireRole>
  );
}
