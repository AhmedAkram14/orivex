'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFormatter, useTranslations } from 'next-intl';
import { useFieldArray, useForm } from 'react-hook-form';
import { AlertTriangle, CheckCircle2, Plus, ShieldQuestion, Trash2 } from 'lucide-react';
import { useConsultationSummary } from '@/features/consultation/hooks/use-consultation-summary';
import { useDownloadPrescriptionPdf } from '@/features/consultation/hooks/use-download-prescription-pdf';
import { useSignPrescription } from '@/features/consultation/hooks/use-sign-prescription';
import {
  createWritePrescriptionSchema,
  EMPTY_PRESCRIPTION_LINE_ITEM,
  type WritePrescriptionFormValues,
} from '@/features/doctor/schemas/write-prescription.schema';
import type { DoctorPatientChartAppointment, DoctorPatientChartProfile } from '@/features/doctor/api/types';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Icon } from '@/shared/icons/icon';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';
import { cn } from '@/shared/lib/cn';
import { ageFrom, shortId } from '../_lib/patient-display';
import { getAllergyState } from '../_lib/allergy-state';
import { ConfirmNoKnownAllergiesDialog } from './confirm-no-known-allergies-dialog';

type EligibleAppointment = DoctorPatientChartAppointment & { consultationSessionId: string };

export interface WritePrescriptionDialogProps {
  profile: DoctorPatientChartProfile;
  patientProfileId: string;
  eligibleAppointments: EligibleAppointment[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'compose' | 'review' | 'success';

/**
 * Phase 3 (Prescribing & Allergy Safety UX): replaces the old
 * `PrescriptionPanel`-in-a-`Dialog` write flow for the patient chart. Fixes,
 * against the audit:
 *  - No past prescriptions are shown here anymore -- those live in the
 *    Prescriptions tab, not the write form (item 4).
 *  - The header now carries real patient identity (name/age/sex/ID) and the
 *    current allergy status, with a path to confirm it (item 2).
 *  - Compose -> Review -> Sign: a doctor cannot reach the sign mutation
 *    without passing through a read-only Review step that states the
 *    consequence of signing (item 3).
 *  - Multiple medication lines via `useFieldArray`, one real sign call with
 *    `lineItems[]` (Phase 0 finding (d) -- the backend already supports
 *    this).
 */
export function WritePrescriptionDialog({
  profile,
  patientProfileId,
  eligibleAppointments,
  open,
  onOpenChange,
}: WritePrescriptionDialogProps) {
  const t = useTranslations('publicPatient');
  const format = useFormatter();
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');

  useEffect(() => {
    if (open && eligibleAppointments.length === 1 && !selectedAppointmentId) {
      setSelectedAppointmentId(eligibleAppointments[0].id);
    }
    if (!open) {
      setSelectedAppointmentId('');
    }
    // Only re-run when the dialog's own open state or appointment set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eligibleAppointments]);

  const selectedAppointment = eligibleAppointments.find((appointment) => appointment.id === selectedAppointmentId);
  const age = profile.dateOfBirth ? ageFrom(profile.dateOfBirth) : undefined;
  const allergyState = getAllergyState(profile);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('writePrescriptionDialogTitle')}</DialogTitle>
        </DialogHeader>

        {/* Item 2: patient identity, reusing whatever identity data is
            already loaded on the page (no new fetch). */}
        <div className="flex flex-col gap-2 rounded-lg border border-border-default/70 bg-secondary-subtle/40 p-3">
          <p className="text-sm font-medium text-text-primary">
            {profile.fullName}
            {age !== undefined && <span className="font-normal text-text-secondary"> · {t('ageYearsOld', { age })}</span>}
            {profile.gender && (
              <span className="font-normal text-text-secondary"> · {t(`genderOptions.${profile.gender}`)}</span>
            )}
            <bdi dir="ltr" className="font-normal text-text-tertiary"> · {t('patientId', { id: shortId(profile.id) })}</bdi>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {allergyState.kind === 'present' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-subtle px-2.5 py-1 text-xs font-medium text-danger-emphasis">
                <Icon icon={AlertTriangle} size="sm" />
                {allergyState.text}
              </span>
            )}
            {allergyState.kind === 'confirmed-none' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-subtle px-2.5 py-1 text-xs font-medium text-success-emphasis">
                <Icon icon={CheckCircle2} size="sm" />
                {t('allergiesConfirmedNone')}
              </span>
            )}
            {allergyState.kind === 'not-asked' && (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-subtle px-2.5 py-1 text-xs font-medium text-warning-emphasis">
                  <Icon icon={ShieldQuestion} size="sm" />
                  {t('allergiesNotYetConfirmed')}
                </span>
                <ConfirmNoKnownAllergiesDialog patientProfileId={patientProfileId} triggerLabel={t('confirmNoKnownAllergies')} />
              </>
            )}
          </div>
        </div>

        {eligibleAppointments.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prescription-appointment-select" className="text-sm font-medium text-text-primary">
              {t('selectPastAppointmentLabel')}
            </label>
            <Select value={selectedAppointmentId} onValueChange={setSelectedAppointmentId}>
              <SelectTrigger id="prescription-appointment-select">
                <SelectValue placeholder={t('selectPastAppointmentPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {eligibleAppointments.map((appointment) => (
                  <SelectItem key={appointment.id} value={appointment.id}>
                    {format.dateTime(new Date(appointment.scheduledAt), { dateStyle: 'medium' })} —{' '}
                    {appointment.reasonForVisit ?? t('reasonForVisitFallback')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedAppointment && (
          <PrescriptionComposer
            key={selectedAppointment.consultationSessionId}
            consultationSessionId={selectedAppointment.consultationSessionId}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PrescriptionComposerProps {
  consultationSessionId: string;
  onClose: () => void;
}

function PrescriptionComposer({ consultationSessionId, onClose }: PrescriptionComposerProps) {
  const t = useTranslations('publicPatient.prescribe');
  const { data: summary, isLoading, isError } = useConsultationSummary(consultationSessionId);
  const signPrescription = useSignPrescription(consultationSessionId);
  const downloadPrescriptionPdf = useDownloadPrescriptionPdf();

  const [step, setStep] = useState<Step>('compose');
  const [signedPrescriptionId, setSignedPrescriptionId] = useState<string | null>(null);

  const schema = createWritePrescriptionSchema(t);
  const form = useForm<WritePrescriptionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { diagnosisNodeId: '', lineItems: [EMPTY_PRESCRIPTION_LINE_ITEM] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'lineItems' });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (isError || !summary) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  if (summary.diagnoses.length === 0) {
    return <p className="text-sm text-text-secondary">{t('noDiagnosisRecorded')}</p>;
  }

  async function handleNext() {
    const valid = await form.trigger();
    if (valid) {
      setStep('review');
    }
  }

  async function handleSign() {
    const values = form.getValues();
    try {
      const prescription = await signPrescription.mutateAsync({
        diagnosisNodeId: values.diagnosisNodeId,
        lineItems: values.lineItems.map((line) => ({
          drugCatalogId: crypto.randomUUID(),
          drugName: line.drugName.trim(),
          dosage: line.dosage.trim(),
          frequency: line.frequency.trim(),
          durationDays: Number(line.durationDays),
          instructions: line.instructions?.trim() || undefined,
        })),
      });
      setSignedPrescriptionId(prescription.id);
      setStep('success');
    } catch {
      // Sign-error state below preserves the entered form data -- nothing
      // is cleared or reset on failure.
    }
  }

  const diagnosisLabel = summary.diagnoses.find((node) => node.id === form.getValues('diagnosisNodeId'))?.description;

  if (step === 'success' && signedPrescriptionId) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-success-subtle bg-success-subtle p-4 text-success-emphasis" role="status">
        <div className="flex items-center gap-2">
          <Icon icon={CheckCircle2} />
          <p className="text-sm font-semibold">{t('successTitle')}</p>
        </div>
        <p className="text-sm">{t('successDescription')}</p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={downloadPrescriptionPdf.isPending}
            onClick={() => downloadPrescriptionPdf.mutate(signedPrescriptionId)}
          >
            {t('downloadPdf')}
          </Button>
          <Button type="button" size="sm" onClick={onClose}>
            {t('done')}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-lg border border-border-default p-4">
          <p className="text-sm font-medium text-text-primary">{t('reviewHeading')}</p>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">{t('diagnosisLabel')}</p>
            <p className="text-sm text-text-primary">{diagnosisLabel}</p>
          </div>
          <ul className="flex flex-col gap-2">
            {form.getValues('lineItems').map((line, index) => (
              <li key={index} className="rounded-md border border-border-default/70 p-3 text-sm">
                <p className="font-medium text-text-primary">
                  {line.drugName} — {line.dosage}, {line.frequency}
                </p>
                <p className="text-text-secondary">{t('durationDaysValue', { count: Number(line.durationDays) })}</p>
                {line.instructions && <p className="text-text-secondary">{line.instructions}</p>}
              </li>
            ))}
          </ul>
        </div>

        <Alert variant="warning">{t('signConsequence')}</Alert>

        {signPrescription.isError && (
          <Alert variant="danger" role="alert">
            {signPrescription.error instanceof ApiError ? signPrescription.error.message : t('signError')}
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setStep('compose')}>
            {t('back')}
          </Button>
          <Button type="button" loading={signPrescription.isPending} onClick={handleSign}>
            {t('signAction')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleNext();
        }}
      >
        <FormField
          control={form.control}
          name="diagnosisNodeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('diagnosisLabel')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger aria-label={t('diagnosisLabel')}>
                    <SelectValue placeholder={t('diagnosisPlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {summary.diagnoses.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.description ?? node.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-text-primary">{t('medicationsHeading')}</p>
          {fields.map((line, index) => (
            <div key={line.id} className={cn('flex flex-col gap-3 rounded-lg border border-border-default p-4', fields.length > 1 && 'relative')}>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-2 top-2"
                  aria-label={t('removeMedication')}
                  onClick={() => remove(index)}
                >
                  <Icon icon={Trash2} size="sm" />
                </Button>
              )}

              <FormField
                control={form.control}
                name={`lineItems.${index}.drugName`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('drugNameLabel')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('drugNamePlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap gap-3">
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.dosage`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>{t('dosageLabel')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('dosagePlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.frequency`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>{t('frequencyLabel')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('frequencyPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.durationDays`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>{t('durationLabel')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" inputMode="numeric" min="1" step="1" placeholder={t('durationPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name={`lineItems.${index}.instructions`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('instructionsLabel')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder={t('instructionsPlaceholder')} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => append(EMPTY_PRESCRIPTION_LINE_ITEM)}>
            <Icon icon={Plus} size="sm" />
            {t('addMedication')}
          </Button>
        </div>

        <div className="flex justify-end">
          <Button type="submit">{t('next')}</Button>
        </div>
      </form>
    </Form>
  );
}
