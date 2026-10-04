'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { DoctorEarningsSummary } from '@/features/payment/components/doctor-earnings-summary';
import { ExportEarningsButton } from '@/features/payment/components/export-earnings-button';
import { useEarningsRange } from '@/features/payment/hooks/use-earnings-range';
import { RequireRole } from '@/shared/auth/require-role';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Doctor Workspace's "Earnings" page (I2 -- docs/01-prd.md L15, L94
 * §2.10) -- real per-cycle earnings and commission, derived on demand from
 * the existing PaymentTransaction ledger, never a fabricated payout. The
 * header carries the page's actions (Export CSV for the selected range,
 * View reports); everything below follows the range toolbar.
 */
export default function DoctorEarningsPage() {
  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <DoctorEarnings />
    </RequireRole>
  );
}

function DoctorEarnings() {
  const t = useTranslations('doctor.earnings');
  const { range, setRange, openEnded } = useEarningsRange();

  return (
    <Page>
      <WorkspaceHeader
        breadcrumbs={<AppBreadcrumbs />}
        title={t('title')}
        description={t('description')}
        actions={
          <>
            <ExportEarningsButton filter={range} />
            <Button asChild variant="ghost" size="sm">
              <Link href="/doctor/reports">
                {t('viewReports')}
                <Icon icon={ArrowRight} size="sm" flipRtl />
              </Link>
            </Button>
          </>
        }
      />
      <DoctorEarningsSummary range={range} openEnded={openEnded} onRangeChange={setRange} />
    </Page>
  );
}
