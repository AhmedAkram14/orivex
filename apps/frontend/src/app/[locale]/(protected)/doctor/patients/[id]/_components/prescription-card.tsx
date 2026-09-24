'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useDownloadPrescriptionPdf } from '@/features/consultation/hooks/use-download-prescription-pdf';
import type { DoctorPatientChartPrescription } from '@/features/doctor/api/types';
import { Badge, type BadgeProps } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

const prescriptionBadgeVariant: Record<DoctorPatientChartPrescription['status'], NonNullable<BadgeProps['variant']>> = {
  active: 'success',
  expired: 'neutral',
};

export interface PrescriptionCardProps {
  prescription: DoctorPatientChartPrescription;
}

/**
 * Phase 3 (Prescribing & Allergy Safety UX), item 4: adds a real
 * "Download PDF" action to every prescription card in the chart's
 * Prescriptions tab -- previously the PDF link only existed inside the
 * write-prescription form itself. Reuses `GET /prescriptions/:id/pdf`
 * (`useDownloadPrescriptionPdf`), which only needs the prescription's own
 * `id` -- already present on `DoctorPatientChartPrescription` -- so no new
 * endpoint or field is needed.
 *
 * Duration/issue/expiry dates and an explicit "signed" flag are NOT shown
 * here: `DoctorPatientChartPrescriptionResponseDto` (this card's real data
 * source) doesn't carry `durationDays`, `signedAt`, or `verificationCode` --
 * only `PrescriptionResponseDto` (the single-record read, `GET
 * /prescriptions/:id`) does. Rather than fabricate those fields on the list
 * view, this is called out as a backend proposal in
 * IMPLEMENTATION_NOTES.md's Phase 3 section.
 */
export function PrescriptionCard({ prescription }: PrescriptionCardProps) {
  const t = useTranslations('publicPatient');
  const format = useFormatter();
  const downloadPrescriptionPdf = useDownloadPrescriptionPdf();

  return (
    <li className="flex flex-col gap-1 rounded-xl border border-border-default/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-text-primary">{prescription.medicationName}</p>
        <Badge variant={prescriptionBadgeVariant[prescription.status]}>{t(`prescriptionStatus.${prescription.status}`)}</Badge>
      </div>
      <p className="text-sm text-text-secondary">
        {prescription.dosageAmount}, {prescription.frequencyLabel}
      </p>
      {prescription.instructions && <p className="text-sm text-text-secondary">{prescription.instructions}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-tertiary">
          {t('by', { name: prescription.prescribedBy })} · {format.dateTime(new Date(prescription.prescribedAt), { dateStyle: 'medium' })}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={downloadPrescriptionPdf.isPending}
          onClick={() => downloadPrescriptionPdf.mutate(prescription.id)}
        >
          {t('downloadPrescriptionPdf')}
        </Button>
      </div>
    </li>
  );
}
