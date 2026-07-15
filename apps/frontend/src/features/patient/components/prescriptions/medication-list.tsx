'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { Prescription } from '@/features/patient/api/types';
import { EmptyState } from '@/shared/ui/empty-state';
import { MedicationCard } from '@/shared/ui/medications/medication-card';

export interface MedicationListProps {
  prescriptions: Prescription[];
  emptyTitle: string;
  emptyDescription: string;
}

const REFILL_BADGE_STATUSES: Prescription['refillStatus'][] = ['due-soon', 'due', 'none-remaining'];

/** Renders a list of `MedicationCard`s from real `Prescription` data — the shared rendering both the Active and Previous tabs use, so formatting/translation logic lives in exactly one place. */
export function MedicationList({ prescriptions, emptyTitle, emptyDescription }: MedicationListProps) {
  const tStatus = useTranslations('patient.prescriptions.status');
  const tRefillStatus = useTranslations('patient.prescriptions.refillStatus');
  const t = useTranslations('patient.prescriptions');
  const format = useFormatter();

  if (prescriptions.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {prescriptions.map((prescription) => (
        <li key={prescription.id}>
          <MedicationCard
            medicationName={prescription.medicationName}
            dosageAmount={prescription.dosageAmount}
            dosesPerDay={prescription.dosesPerDay}
            frequencyLabel={prescription.frequencyLabel}
            prescribedBy={t('prescribedBy', { name: prescription.prescribedBy })}
            prescribedAtLabel={format.dateTime(new Date(prescription.prescribedAt), {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
            status={prescription.status}
            statusLabel={tStatus(prescription.status)}
            refillStatus={prescription.refillStatus}
            refillStatusLabel={tRefillStatus(prescription.refillStatus)}
            showRefillBadge={REFILL_BADGE_STATUSES.includes(prescription.refillStatus)}
            refillsRemainingLabel={
              prescription.refillsRemaining !== undefined
                ? t('refillsRemaining', { count: prescription.refillsRemaining })
                : undefined
            }
            instructions={prescription.instructions}
          />
        </li>
      ))}
    </ul>
  );
}
