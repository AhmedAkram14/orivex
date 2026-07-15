'use client';

import { useTranslations } from 'next-intl';
import { usePatientActivePrescriptions } from '@/features/patient/hooks/use-patient-active-prescriptions';
import type { ActivePrescriptionPreview } from '@/features/patient/api/types';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

const badgeVariantByStatus: Record<ActivePrescriptionPreview['status'], 'success' | 'warning'> = {
  active: 'success',
  'refill-due': 'warning',
};

function StatusBadge({ status }: { status: ActivePrescriptionPreview['status'] }) {
  const t = useTranslations('patient.dashboard.activePrescriptions.status');
  return <Badge variant={badgeVariantByStatus[status]}>{t(status)}</Badge>;
}

/** The Patient Portal's "Active Prescriptions" widget — a lightweight preview list (medication name, dosage, prescriber, status), distinct from milestone 5's full medication cards. Empty today since no Clinical module is wired into the frontend yet. */
export function ActivePrescriptionsWidget() {
  const t = useTranslations('patient.dashboard');
  const { data: items, isLoading } = usePatientActivePrescriptions();

  return (
    <WidgetContainer title={t('activePrescriptionsTitle')}>
      {isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : items && items.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5">
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
          title={t('activePrescriptionsEmptyTitle')}
          description={t('activePrescriptionsEmptyDescription')}
        />
      )}
    </WidgetContainer>
  );
}
