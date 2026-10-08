'use client';

import { Pill } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePatientActivePrescriptions } from '@/features/patient/hooks/use-patient-active-prescriptions';
import type { ActivePrescriptionPreview } from '@/features/patient/api/types';
import { CardHeaderLink, OverviewList, OverviewRow } from '@/features/patient/components/overview-list';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
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

export function ActivePrescriptionsWidget({ className }: { className?: string }) {
  const t = useTranslations('patient.dashboard');
  const { data: items, isLoading, isError, refetch } = usePatientActivePrescriptions();
  const recent = (items ?? []).slice(0, MAX_ITEMS);

  return (
    <WidgetContainer
      title={<span className="text-h3">{t('activePrescriptionsTitle')}</span>}
      titleAs="h2"
      className={className}
      actions={<CardHeaderLink href="/patient/prescriptions" label={t('viewAll')} context={t('activePrescriptionsTitle')} />}
    >
      {isError ? (
        <Alert variant="danger">
          <span>{t('activePrescriptionsLoadError')}</span>{' '}
          <button type="button" className="font-medium underline" onClick={() => refetch()}>
            {t('retry')}
          </button>
        </Alert>
      ) : isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : recent.length > 0 ? (
        <OverviewList>
          {recent.map((item) => (
            <OverviewRow key={item.id} icon={Pill} title={item.medicationName} body={item.dosageLabel} trailing={<StatusBadge status={item.status} />} />
          ))}
        </OverviewList>
      ) : (
        <EmptyState
          illustration="prescription-none"
          size="sm"
          title={t('activePrescriptionsEmptyTitle')}
          description={t('activePrescriptionsEmptyDescription')}
          // A quiet link, not a button: the Prescriptions page's Previous tab, for anything that has ended.
          action={
            <Link
              href="/patient/prescriptions?tab=previous"
              className="rounded-sm text-sm font-medium text-care-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {t('viewPastPrescriptions')}
            </Link>
          }
        />
      )}
    </WidgetContainer>
  );
}
