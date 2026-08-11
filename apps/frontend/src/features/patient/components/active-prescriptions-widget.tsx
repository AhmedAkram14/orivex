'use client';

import { Pill } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePatientActivePrescriptions } from '@/features/patient/hooks/use-patient-active-prescriptions';
import type { ActivePrescriptionPreview } from '@/features/patient/api/types';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Skeleton } from '@/shared/ui/skeleton';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

const MAX_ITEMS = 3;

const badgeVariantByStatus: Record<ActivePrescriptionPreview['status'], 'success' | 'warning'> = {
  active: 'success',
};

function StatusBadge({ status }: { status: ActivePrescriptionPreview['status'] }) {
  const t = useTranslations('patient.dashboard.activePrescriptions.status');
  return <Badge variant={badgeVariantByStatus[status]}>{t(status)}</Badge>;
}

/** The redesigned "My Health" dashboard's "Active Prescriptions" widget — a lightweight preview list (medication name, dosage, prescriber, status), the most recent few only, with a "View prescriptions" link to the full page. Empty today since no Clinical module is wired into the frontend yet. */
export function ActivePrescriptionsWidget() {
  const t = useTranslations('patient.dashboard');
  const { data: items, isLoading, isError } = usePatientActivePrescriptions();
  const recent = (items ?? []).slice(0, MAX_ITEMS);

  return (
    <WidgetContainer
      title={<span className="text-lg font-semibold">{t('activePrescriptionsTitle')}</span>}
      className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/patient/prescriptions">{t('viewPrescriptionsAction')}</Link>
        </Button>
      }
    >
      {isError ? (
        <Alert variant="danger">{t('activePrescriptionsLoadError')}</Alert>
      ) : isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : recent.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {recent.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-xl border border-border-default/70 p-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success">
                <Icon icon={Pill} size="sm" />
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <p className="text-sm font-medium text-text-primary">{item.medicationName}</p>
                <p className="text-sm text-text-secondary">{item.dosageLabel}</p>
                <p className="text-xs text-text-tertiary">{t('prescribedBy', { name: item.prescribedBy })}</p>
              </div>
              <StatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          className="py-6"
          title={t('activePrescriptionsEmptyTitle')}
          description={t('activePrescriptionsEmptyDescription')}
        />
      )}
    </WidgetContainer>
  );
}
