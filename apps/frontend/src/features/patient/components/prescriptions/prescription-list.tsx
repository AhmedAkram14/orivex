'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { Prescription } from '@/features/patient/api/types';
import { PrescriptionCard } from '@/features/patient/components/prescriptions/prescription-card';
import { PrescriptionEmptyState } from '@/features/patient/components/prescriptions/prescription-empty-state';

export interface PrescriptionListProps {
  prescriptions: Prescription[];
  emptyTitle: string;
  emptyDescription: string;
  /** Real routes only, e.g. Browse Doctors / Book Appointment — omitted for the Previous tab, which has no relevant next action. */
  emptyActions?: ReactNode;
}

/** Renders a list of `PrescriptionCard`s from real `Prescription` data — shared by the Active and Previous tabs so formatting/translation logic lives in exactly one place. */
export function PrescriptionList({ prescriptions, emptyTitle, emptyDescription, emptyActions }: PrescriptionListProps) {
  const tStatus = useTranslations('patient.prescriptions.status');
  const t = useTranslations('patient.prescriptions');
  const format = useFormatter();

  if (prescriptions.length === 0) {
    return <PrescriptionEmptyState title={emptyTitle} description={emptyDescription} actions={emptyActions} />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {prescriptions.map((prescription) => (
        <li key={prescription.id}>
          <PrescriptionCard
            medicationName={prescription.medicationName}
            dosageAmount={prescription.dosageAmount}
            frequencyLabel={prescription.frequencyLabel}
            prescribedBy={t('prescribedBy', { name: prescription.prescribedBy })}
            prescribedAtLabel={format.dateTime(new Date(prescription.prescribedAt), {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
            status={prescription.status}
            statusLabel={tStatus(prescription.status)}
            instructions={prescription.instructions}
          />
        </li>
      ))}
    </ul>
  );
}
