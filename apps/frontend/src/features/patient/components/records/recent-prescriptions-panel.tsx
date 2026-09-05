'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { usePatientPrescriptions } from '@/features/patient/hooks/use-patient-prescriptions';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { MedicationCard } from '@/shared/ui/medications/medication-card';

const RECENT_LIMIT = 3;

/**
 * The Medical Records sidebar's "Recent Prescriptions" panel — a compact
 * preview (most recent {@link RECENT_LIMIT}) of the real
 * `GET /patients/me/prescriptions` list, deep-linking to the full
 * Prescriptions page rather than duplicating its Active/Previous tabs here.
 */
export function RecentPrescriptionsPanel() {
  const t = useTranslations('patient.records');
  const tPrescriptions = useTranslations('patient.prescriptions');
  const tStatus = useTranslations('patient.prescriptions.status');
  const format = useFormatter();
  const { data: prescriptions, isLoading, isError } = usePatientPrescriptions();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-text-secondary">{tPrescriptions('loadError')}</p>;
  }

  const recent = [...(prescriptions ?? [])]
    .sort((a, b) => new Date(b.prescribedAt).getTime() - new Date(a.prescribedAt).getTime())
    .slice(0, RECENT_LIMIT);

  if (recent.length === 0) {
    return <EmptyState title={t('recentPrescriptionsEmptyTitle')} description={t('recentPrescriptionsEmptyDescription')} className="py-6" />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {recent.map((prescription) => (
        <li key={prescription.id}>
          <MedicationCard
            medicationName={prescription.medicationName}
            dosageAmount={prescription.dosageAmount}
            frequencyLabel={prescription.frequencyLabel}
            prescribedBy={tPrescriptions('prescribedBy', { name: prescription.prescribedBy })}
            prescribedAtLabel={format.dateTime(new Date(prescription.prescribedAt), {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
            status={prescription.status}
            statusLabel={tStatus(prescription.status)}
          />
        </li>
      ))}
    </ul>
  );
}
