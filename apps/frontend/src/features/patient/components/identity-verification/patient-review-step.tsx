'use client';

import { useTranslations } from 'next-intl';
import { useSubmitPatientVerification } from '@/features/patient/hooks/use-submit-patient-verification';
import type { DocumentSlots } from '@/shared/verification/components/documents-step';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';

export interface PatientReviewStepProps {
  patientProfileId: string;
  documents: DocumentSlots;
  onSubmitted: () => void;
  onBack: () => void;
}

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.7): Patient Identity
 * Verification's final step -- mirrors Doctor Onboarding's `ReviewStep`
 * shape for UI/code consistency (§2), but is its own component rather than
 * a literal generalization: a Patient submission has no license/specialty
 * fields at all (`SubmitPatientVerificationRequestDto` is documentAssetIds
 * only), so there is nothing to make those fields optional over.
 */
export function PatientReviewStep({ patientProfileId, documents, onSubmitted, onBack }: PatientReviewStepProps) {
  const t = useTranslations('patient.identityVerification.reviewStep');
  const submitVerification = useSubmitPatientVerification(patientProfileId);
  const documentAssetIds = Object.values(documents)
    .filter((document): document is NonNullable<typeof document> => Boolean(document))
    .map((document) => document.id);

  async function handleSubmit() {
    try {
      await submitVerification.mutateAsync({ documentAssetIds });
      onSubmitted();
    } catch {
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

      <Card>
        <CardContent className="flex flex-col gap-2 pt-6">
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-text-tertiary">{t('documents')}</dt>
              <dd className="font-medium text-text-primary">{t('documentsCount', { count: documentAssetIds.length })}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          {t('back')}
        </Button>
        <Button type="button" onClick={handleSubmit} loading={submitVerification.isPending}>
          {t('submit')}
        </Button>
      </div>
    </div>
  );
}
