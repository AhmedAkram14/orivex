'use client';

import { ArrowLeft, FileText, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { useSubmitPatientVerification } from '@/features/patient/hooks/use-submit-patient-verification';
import type { MediaAssetPurpose } from '@/shared/media/types';
import type { DocumentSlots } from '@/shared/verification/components/documents-step';
import { ApiError } from '@/shared/lib/api/client';
import { Icon } from '@/shared/icons/icon';
import { ActionBar } from '@/shared/ui/action-bar';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

export interface PatientReviewStepProps {
  patientProfileId: string;
  documents: DocumentSlots;
  slots: readonly MediaAssetPurpose[];
  onSubmitted: () => void;
  onBack: () => void;
}

/**
 * Patient identity verification's last step: the three documents as they will be sent, then
 * `POST /patients/:id/verifications` with `{ documentAssetIds }` (unchanged), guarded against a double submit.
 */
export function PatientReviewStep({ patientProfileId, documents, slots, onSubmitted, onBack }: PatientReviewStepProps) {
  const t = useTranslations('patient.identityVerification.reviewStep');
  const tSlots = useTranslations('patient.identityVerification.documentsStep.slots');
  const submitVerification = useSubmitPatientVerification(patientProfileId);
  const submitting = useRef(false);
  const documentAssetIds = Object.values(documents)
    .filter((document): document is NonNullable<typeof document> => Boolean(document))
    .map((document) => document.id);

  async function handleSubmit() {
    if (submitting.current) return;
    submitting.current = true;
    try {
      await submitVerification.mutateAsync({ documentAssetIds });
      onSubmitted();
    } catch {
      submitting.current = false;
      // Inline error rendered below from submitVerification.error.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">{t('description')}</p>

      {submitVerification.error instanceof ApiError && (
        <Alert variant="danger" role="alert">
          {submitVerification.error.message}
        </Alert>
      )}

      <section className="flex flex-col gap-3 rounded-(--r-card) border border-border-default bg-surface p-5">
        <h2 className="text-small font-semibold text-text-secondary">{t('documentsCount', { count: documentAssetIds.length })}</h2>
        <ul className="flex flex-col gap-2">
          {slots.map((slot) => {
            const document = documents[slot];
            if (!document) return null;
            return (
              <li key={slot} className="flex items-center gap-3">
                {document.contentType?.startsWith('image/') && document.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a local blob: preview of the picked file
                  <img src={document.previewUrl} alt="" className="size-10 rounded-md object-cover ring-1 ring-border-strong" />
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-md bg-surface-2 ring-1 ring-border-strong">
                    <Icon icon={FileText} size="sm" />
                  </span>
                )}
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold text-text-primary">{tSlots(slot)}</span>
                  <bdi className="truncate text-small text-text-secondary">{document.fileName}</bdi>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <ActionBar
        start={
          <Button type="button" variant="secondary" onClick={onBack}>
            <Icon icon={ArrowLeft} size="sm" flipRtl />
            {t('back')}
          </Button>
        }
        end={
          <Button type="button" onClick={handleSubmit} loading={submitVerification.isPending} disabled={submitVerification.isPending || submitVerification.isSuccess}>
            <Icon icon={Send} size="sm" flipRtl />
            {t('submit')}
          </Button>
        }
      />
    </div>
  );
}
