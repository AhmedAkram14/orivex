'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { useConsultationSummary } from '@/features/consultation/hooks/use-consultation-summary';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Section } from '@/shared/ui/layout/section';
import { Skeleton } from '@/shared/ui/skeleton';
import { getDurationMinutes } from '@/shared/lib/date/format-duration';

export interface DoctorConsultationSummaryActionProps {
  consultationSessionId: string;
  /** Rendered as the trigger's content -- lets callers reuse a plain link-styled button (Patient Chart's "Previous visits" rows) instead of this component's own default label. */
  triggerLabel?: string;
}

/**
 * Phase 8: routes the raw minute count through the shared `getDurationMinutes`
 * helper (was independently duplicated math here and in the patient-facing
 * `ConsultationOutcomeAction`) -- returns `null` when either timestamp is
 * missing so callers can skip rendering the row entirely, same as before.
 */
function durationMinutesOrNull(startedAt: string | null, closedAt: string | null): number | null {
  if (!startedAt || !closedAt) return null;
  return getDurationMinutes(startedAt, closedAt);
}

/**
 * Phase 2 (Appointment Visibility & Consultation History): the doctor-facing
 * mirror of `ConsultationOutcomeAction` (the patient's own post-consultation
 * summary dialog) -- same real endpoint (`GET /consultations/:id/summary`,
 * `useConsultationSummary`), same Dialog-based reveal pattern (chosen over
 * `shared/ui/side-panel.tsx`'s Drawer since Dialog is the pattern already
 * used everywhere else in this codebase for "view this record's full
 * detail" -- Drawer's only real usages are mobile nav and the landing page).
 * Shows what a doctor actually needs from a past visit: SOAP notes,
 * diagnoses, prescriptions, lab requests, and vitals recorded during the
 * session -- never a rating/review widget (that's the patient's own view).
 */
export function DoctorConsultationSummaryAction({ consultationSessionId, triggerLabel }: DoctorConsultationSummaryActionProps) {
  const t = useTranslations('consultation.doctorSummary');
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const { data: summary, isLoading, isError } = useConsultationSummary(open ? consultationSessionId : undefined);
  const durationMinutes = summary ? durationMinutesOrNull(summary.session.startedAt, summary.session.closedAt) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {triggerLabel ?? t('openAction')}
      </Button>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        {isLoading && <Skeleton className="h-64 w-full" />}
        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        {summary && (
          <div className="flex flex-col gap-4">
            <Section title={t('visitDetails')}>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-text-tertiary">{t('date')}</p>
                  <p className="text-text-primary">
                    {format.dateTime(new Date(summary.appointment.scheduledAt), { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                {durationMinutes !== null && (
                  <div>
                    <p className="text-text-tertiary">{t('duration')}</p>
                    <p className="text-text-primary">{t('durationMinutes', { minutes: durationMinutes })}</p>
                  </div>
                )}
              </div>
            </Section>

            {summary.clinicalNotes.length > 0 && (
              <Section title={t('clinicalNotes')}>
                <ul className="flex flex-col gap-3 text-sm">
                  {summary.clinicalNotes.map((note) => (
                    <li key={note.id} className="rounded-lg border border-border-default p-3">
                      {note.subjective || note.objective || note.assessment || note.plan ? (
                        <dl className="flex flex-col gap-1.5">
                          {note.subjective && (
                            <div>
                              <dt className="text-xs font-medium text-text-tertiary">{t('soap.subjective')}</dt>
                              <dd className="text-text-primary">{note.subjective}</dd>
                            </div>
                          )}
                          {note.objective && (
                            <div>
                              <dt className="text-xs font-medium text-text-tertiary">{t('soap.objective')}</dt>
                              <dd className="text-text-primary">{note.objective}</dd>
                            </div>
                          )}
                          {note.assessment && (
                            <div>
                              <dt className="text-xs font-medium text-text-tertiary">{t('soap.assessment')}</dt>
                              <dd className="text-text-primary">{note.assessment}</dd>
                            </div>
                          )}
                          {note.plan && (
                            <div>
                              <dt className="text-xs font-medium text-text-tertiary">{t('soap.plan')}</dt>
                              <dd className="text-text-primary">{note.plan}</dd>
                            </div>
                          )}
                        </dl>
                      ) : (
                        <p className="text-text-primary">{note.content}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {summary.diagnoses.length > 0 && (
              <Section title={t('diagnoses')}>
                <ul className="flex flex-col gap-2 text-sm">
                  {summary.diagnoses.map((diagnosis) => (
                    <li key={diagnosis.id} className="flex items-center justify-between gap-2 rounded-lg border border-border-default p-3">
                      <span className="text-text-primary">{diagnosis.description ?? t('untitledDiagnosis')}</span>
                      <Badge variant="neutral">{t(`certainty.${diagnosis.certaintyLevel}`)}</Badge>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {summary.prescriptions.length > 0 && (
              <Section title={t('prescriptions')}>
                <ul className="flex flex-col gap-2 text-sm">
                  {summary.prescriptions.map((prescription) => (
                    <li key={prescription.id} className="rounded-lg border border-border-default p-3">
                      {prescription.lineItems.map((item) => (
                        <div key={`${prescription.id}-${item.drugName ?? item.drugCatalogId}`}>
                          {item.drugName ?? item.drugCatalogId} — {item.dosage}, {item.frequency}
                        </div>
                      ))}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {summary.labRequests.length > 0 && (
              <Section title={t('labRequests')}>
                <ul className="flex flex-col gap-2 text-sm">
                  {summary.labRequests.map((lab) => (
                    <li key={lab.id} className="rounded-lg border border-border-default p-3">
                      <p className="text-text-primary">{lab.testName}</p>
                      {lab.clinicalReason && <p className="text-text-secondary">{lab.clinicalReason}</p>}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {summary.vitalReadings.length > 0 && (
              <Section title={t('vitals')}>
                <ul className="flex flex-wrap gap-2 text-sm">
                  {summary.vitalReadings.map((vital) => (
                    <li key={vital.id} className="rounded-lg border border-border-default px-3 py-2">
                      {vital.valueLabel}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {summary.followUpRecommendation && (
              <Section title={t('followUp')}>
                <Alert variant="info">
                  {summary.followUpRecommendation.reason}
                  {summary.followUpRecommendation.recommendedDate
                    ? ` — ${format.dateTime(new Date(summary.followUpRecommendation.recommendedDate), { dateStyle: 'medium' })}`
                    : ''}
                </Alert>
              </Section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
