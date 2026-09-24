'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useConsultationSummary } from '@/features/consultation/hooks/use-consultation-summary';
import { useDownloadPrescriptionPdf } from '@/features/consultation/hooks/use-download-prescription-pdf';
import { useSignPrescription } from '@/features/consultation/hooks/use-sign-prescription';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';

export interface PrescriptionPanelProps {
  consultationSessionId: string;
  /**
   * Optional escape hatch for a parent that tracks its own unsaved-work
   * guard across multiple sub-forms (e.g. `ConsultationWorkspaceAction`'s
   * "unsaved input" warning before completing a consultation). Fired
   * whenever this panel's own draft input becomes non-empty/empty. A
   * standalone caller (e.g. the patient chart's "Write prescription"
   * dialog) can simply ignore this.
   */
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * Doctor prescription authoring (ORIVEX Remaining Work Audit, P0 C4),
 * extracted (Doctor Patient Chart Phase 3.1) out of
 * `ConsultationWorkspaceAction` into a standalone, self-fetching component so
 * it can also be dropped into the patient chart's "Write prescription"
 * dialog (Phase 3.2), which has no already-loaded `ConsultationSummary` to
 * hand it. Fully self-contained: fetches its own summary, owns all its own
 * draft state, and calls `useSignPrescription`/`useDownloadPrescriptionPdf`
 * itself. A doctor signs one medication per submission against a diagnosis
 * already recorded for this session (the real backend requires a real
 * diagnosisNodeId) -- gated behind having recorded at least one diagnosis,
 * never a fabricated one. No ReferenceDataModule drug catalog exists yet, so
 * drugCatalogId is a real client-minted id (crypto.randomUUID()), never a
 * reference to a catalog entry that doesn't exist; drugName carries the
 * doctor's actual free-text medication name and is what every consumer
 * displays.
 */
export function PrescriptionPanel({ consultationSessionId, onDirtyChange }: PrescriptionPanelProps) {
  const t = useTranslations('consultation.workspace');
  const { data: summary, isLoading } = useConsultationSummary(consultationSessionId);
  const signPrescription = useSignPrescription(consultationSessionId);
  const downloadPrescriptionPdf = useDownloadPrescriptionPdf();

  const [prescriptionDiagnosisNodeId, setPrescriptionDiagnosisNodeId] = useState('');
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [durationDaysInput, setDurationDaysInput] = useState('');
  const [instructions, setInstructions] = useState('');
  const [prescriptionJustSaved, setPrescriptionJustSaved] = useState(false);

  const durationDaysValue = durationDaysInput.trim() ? Number(durationDaysInput) : undefined;
  const durationDaysInvalid =
    durationDaysInput.trim() !== '' && !(Number.isInteger(durationDaysValue) && durationDaysValue! > 0);
  const hasAnyPrescriptionInput = Boolean(
    medicationName.trim() || dosage.trim() || frequency.trim() || durationDaysInput.trim() || instructions.trim(),
  );
  const canSavePrescription = Boolean(
    prescriptionDiagnosisNodeId &&
      medicationName.trim() &&
      dosage.trim() &&
      frequency.trim() &&
      !durationDaysInvalid &&
      durationDaysValue,
  );

  useEffect(() => {
    onDirtyChange?.(hasAnyPrescriptionInput);
  }, [hasAnyPrescriptionInput, onDirtyChange]);

  async function handleSavePrescription() {
    if (!prescriptionDiagnosisNodeId || !durationDaysValue) {
      return;
    }
    try {
      await signPrescription.mutateAsync({
        diagnosisNodeId: prescriptionDiagnosisNodeId,
        lineItems: [
          {
            drugCatalogId: crypto.randomUUID(),
            drugName: medicationName.trim(),
            dosage: dosage.trim(),
            frequency: frequency.trim(),
            durationDays: durationDaysValue,
            instructions: instructions.trim() || undefined,
          },
        ],
      });
    } catch {
      // Surfaced via signPrescription.isError below -- entered values stay
      // in place so nothing already typed is lost on a failed save.
      return;
    }
    setMedicationName('');
    setDosage('');
    setFrequency('');
    setDurationDaysInput('');
    setInstructions('');
    setPrescriptionJustSaved(true);
    window.setTimeout(() => setPrescriptionJustSaved(false), 4000);
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {summary.prescriptions.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('noPrescriptions')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {summary.prescriptions.map((prescription) => (
            <li key={prescription.id} className="flex items-start justify-between gap-3 rounded-lg border border-border-default p-3 text-sm">
              <div>
                {prescription.lineItems.map((item) => (
                  <div key={`${prescription.id}-${item.drugName ?? item.drugCatalogId}`}>
                    {item.drugName ?? item.drugCatalogId} — {item.dosage}, {item.frequency}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={downloadPrescriptionPdf.isPending}
                onClick={() => downloadPrescriptionPdf.mutate(prescription.id)}
              >
                {t('downloadPrescriptionPdf')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {summary.diagnoses.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('prescriptionNeedsDiagnosis')}</p>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-border-default p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prescription-diagnosis" className="text-sm font-medium text-text-primary">
              {t('prescriptionDiagnosisLabel')}
            </label>
            <Select value={prescriptionDiagnosisNodeId} onValueChange={setPrescriptionDiagnosisNodeId}>
              <SelectTrigger id="prescription-diagnosis">
                <SelectValue placeholder={t('prescriptionDiagnosisPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {summary.diagnoses.map((node) => (
                  <SelectItem key={node.id} value={node.id}>
                    {node.description ?? node.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="prescription-medication" className="text-sm font-medium text-text-primary">
              {t('prescriptionMedicationLabel')}
            </label>
            <Input
              id="prescription-medication"
              value={medicationName}
              onChange={(event) => setMedicationName(event.target.value)}
              placeholder={t('prescriptionMedicationPlaceholder')}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="prescription-dosage" className="text-sm font-medium text-text-primary">
                {t('prescriptionDosageLabel')}
              </label>
              <Input
                id="prescription-dosage"
                value={dosage}
                onChange={(event) => setDosage(event.target.value)}
                placeholder={t('prescriptionDosagePlaceholder')}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="prescription-frequency" className="text-sm font-medium text-text-primary">
                {t('prescriptionFrequencyLabel')}
              </label>
              <Input
                id="prescription-frequency"
                value={frequency}
                onChange={(event) => setFrequency(event.target.value)}
                placeholder={t('prescriptionFrequencyPlaceholder')}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="prescription-duration" className="text-sm font-medium text-text-primary">
                {t('prescriptionDurationLabel')}
              </label>
              <Input
                id="prescription-duration"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={durationDaysInput}
                onChange={(event) => setDurationDaysInput(event.target.value)}
                aria-invalid={durationDaysInvalid}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="prescription-instructions" className="text-sm font-medium text-text-primary">
              {t('prescriptionInstructionsLabel')}
            </label>
            <Textarea
              id="prescription-instructions"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder={t('prescriptionInstructionsPlaceholder')}
              rows={2}
            />
          </div>

          {signPrescription.isError && <Alert variant="danger">{t('saveError')}</Alert>}
          {prescriptionJustSaved && !signPrescription.isError && (
            <Alert variant="success">{t('prescriptionSaveSuccess')}</Alert>
          )}
          <Button
            type="button"
            size="sm"
            loading={signPrescription.isPending}
            disabled={!canSavePrescription}
            onClick={handleSavePrescription}
          >
            {t('savePrescription')}
          </Button>
        </div>
      )}
    </div>
  );
}
