'use client';

import { useTranslations } from 'next-intl';
import type { DoctorProfile } from '@/features/doctor/api/types';
import { useSubmitVerification } from '@/features/doctor/hooks/use-submit-verification';
import type { DocumentSlots } from '@/shared/verification/components/documents-step';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';

export interface ReviewStepProps {
  profile: DoctorProfile;
  documents: DocumentSlots;
  onSubmitted: () => void;
  onBack: () => void;
}

/**
 * Doctor Onboarding (Phase 4 continuation; redesigned Onboarding Redesign
 * 2026-07-21 proposal, Stage O.6): the wizard's final step -- submits for
 * review via the real `POST /doctors/:id/verifications`, reused as-is.
 * `specialtyCode` sends the profile's own free-text `specialty` (now
 * populated from the Professional Info step's reference-data dropdown
 * selection, resolved to its display name at that step) -- this backend
 * field is a free-string historical snapshot on the VerificationCase, not a
 * live FK, so a human-readable name is exactly what it expects.
 */
export function ReviewStep({ profile, documents, onSubmitted, onBack }: ReviewStepProps) {
  const t = useTranslations('doctor.onboarding.reviewStep');
  const submitVerification = useSubmitVerification(profile.id);
  const documentAssetIds = Object.values(documents)
    .filter((document): document is NonNullable<typeof document> => Boolean(document))
    .map((document) => document.id);

  async function handleSubmit() {
    try {
      await submitVerification.mutateAsync({
        licenseNumber: profile.licenseNumber,
        specialtyCode: profile.specialty,
        documentAssetIds,
      });
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
              <dt className="text-text-tertiary">{t('licenseNumber')}</dt>
              <dd className="font-medium text-text-primary">{profile.licenseNumber}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-tertiary">{t('specialty')}</dt>
              <dd className="font-medium text-text-primary">{profile.specialty}</dd>
            </div>
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
