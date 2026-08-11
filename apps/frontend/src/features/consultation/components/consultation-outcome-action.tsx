'use client';

import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { useConsultationSummary } from '@/features/consultation/hooks/use-consultation-summary';
import { RateConsultationForm } from '@/features/consultation/components/rate-consultation-form';
import { useDeleteConsultationFeedback } from '@/features/consultation/hooks/use-delete-consultation-feedback';
import { useDoctorById } from '@/features/doctor/hooks/use-doctor-by-id';
import type { ConsultationFeedback } from '@/features/consultation/api/types';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Icon } from '@/shared/icons/icon';
import { Section } from '@/shared/ui/layout/section';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';

const RATING_DISPLAY_VALUES = [1, 2, 3, 4, 5] as const;

export interface ConsultationOutcomeActionProps {
  consultationSessionId: string;
  /** Additive, default false (every existing caller's behavior is unchanged) -- opens the dialog immediately on mount, for the "Consultation completed" notification's deep link (`?consultationSessionId=`) landing a patient straight on this specific summary instead of the bare appointments list. */
  autoOpen?: boolean;
}

function formatDuration(startedAt: string | null, closedAt: string | null): string | null {
  if (!startedAt || !closedAt) return null;
  const minutes = Math.round((new Date(closedAt).getTime() - new Date(startedAt).getTime()) / 60_000);
  return `${minutes} min`;
}

interface SubmittedRatingViewProps {
  feedback: ConsultationFeedback;
  onEdit: () => void;
  consultationSessionId: string;
  doctorProfileId: string;
}

/** Read-only view of an already-submitted review, with Edit/Delete actions -- the 2026-07-29 product follow-up replacing the old immutable "you rated this X of 5" alert. */
function SubmittedRatingView({ feedback, onEdit, consultationSessionId, doctorProfileId }: SubmittedRatingViewProps) {
  const t = useTranslations('consultation.outcome');
  const deleteFeedback = useDeleteConsultationFeedback(consultationSessionId, doctorProfileId);

  async function handleDelete() {
    if (!window.confirm(t('deleteConfirmBody'))) return;
    await deleteFeedback.mutateAsync();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1" aria-label={t('alreadyRated', { rating: feedback.rating })}>
        {RATING_DISPLAY_VALUES.map((value) => (
          <Icon
            key={value}
            icon={Star}
            size="lg"
            className={cn(value <= feedback.rating ? 'fill-warning text-warning' : 'text-border-strong')}
          />
        ))}
      </div>
      {feedback.comment && <p className="text-sm text-text-secondary">{feedback.comment}</p>}
      {deleteFeedback.isError && <Alert variant="danger">{t('deleteError')}</Alert>}
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          {t('edit')}
        </Button>
        <Button type="button" variant="danger" size="sm" loading={deleteFeedback.isPending} onClick={handleDelete}>
          {t('delete')}
        </Button>
      </div>
    </div>
  );
}

/**
 * §7/§8/§12 of the consultation-completion follow-up: the patient's clear
 * post-consultation state -- reachable from the completed appointment card
 * (never "simply return to an unchanged appointment card"). Shows doctor,
 * date/time, duration, prescriptions, follow-up recommendation, and the
 * "Rate your consultation" CTA (or the already-submitted review). Never
 * shows doctor-private clinical notes as private -- this system's existing
 * authorization model already exposes them to the patient via
 * GET /patients/me/medical-records, so there's no boundary being crossed
 * here (see GetConsultationSummaryUseCase's own comment).
 */
export function ConsultationOutcomeAction({ consultationSessionId, autoOpen = false }: ConsultationOutcomeActionProps) {
  const t = useTranslations('consultation.outcome');
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const [isEditingRating, setIsEditingRating] = useState(false);
  const { data: summary, isLoading, isError } = useConsultationSummary(open ? consultationSessionId : undefined);
  const { data: doctor } = useDoctorById(summary?.appointment.doctorId ?? '');

  // Only ever reacts to `autoOpen` going true (a notification deep link) --
  // never re-forces the dialog open again after the patient closes it.
  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t('openAction')}
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
                  <p className="text-text-tertiary">{t('doctor')}</p>
                  <p className="text-text-primary">{doctor?.fullName ?? t('loadingDoctor')}</p>
                </div>
                <div>
                  <p className="text-text-tertiary">{t('date')}</p>
                  <p className="text-text-primary">
                    {format.dateTime(new Date(summary.appointment.scheduledAt), { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary">{t('status')}</p>
                  <Badge variant="success">{t('completed')}</Badge>
                </div>
                {formatDuration(summary.session.startedAt, summary.session.closedAt) && (
                  <div>
                    <p className="text-text-tertiary">{t('duration')}</p>
                    <p className="text-text-primary">{formatDuration(summary.session.startedAt, summary.session.closedAt)}</p>
                  </div>
                )}
              </div>
            </Section>

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

            <Section title={t('yourRating')}>
              {summary.feedback && !isEditingRating && (
                <SubmittedRatingView
                  feedback={summary.feedback}
                  onEdit={() => setIsEditingRating(true)}
                  consultationSessionId={consultationSessionId}
                  doctorProfileId={summary.appointment.doctorId}
                />
              )}

              {summary.feedback && isEditingRating && (
                <RateConsultationForm
                  consultationSessionId={consultationSessionId}
                  doctorProfileId={summary.appointment.doctorId}
                  mode="edit"
                  initialRating={summary.feedback.rating}
                  initialComment={summary.feedback.comment ?? ''}
                  onSubmitted={() => setIsEditingRating(false)}
                  onCancel={() => setIsEditingRating(false)}
                />
              )}

              {!summary.feedback && (
                <RateConsultationForm consultationSessionId={consultationSessionId} doctorProfileId={summary.appointment.doctorId} />
              )}
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
