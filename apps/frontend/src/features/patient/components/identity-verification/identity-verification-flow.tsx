'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePatientProfile } from '@/features/patient/hooks/use-patient-profile';
import { useMyPatientVerifications } from '@/features/patient/hooks/use-my-patient-verifications';
import { PatientReviewStep } from '@/features/patient/components/identity-verification/patient-review-step';
import { Link, useRouter } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { DocumentsStep, type DocumentSlots } from '@/shared/verification/components/documents-step';
import { VerificationStatus } from '@/shared/verification/components/verification-status';
import type { MediaAssetPurpose } from '@/shared/media/types';

type WizardStep = 'documents' | 'review';

// Onboarding Redesign (2026-07-21 proposal, Stage O.7): 3 typed upload
// slots -- National ID Front/Back, Selfie with ID (not the 7 Doctor
// Onboarding needs; no professional documents here).
const PATIENT_DOCUMENT_SLOTS: readonly MediaAssetPurpose[] = ['national_id_front', 'national_id_back', 'selfie_with_id'];

export interface IdentityVerificationFlowProps {
  /** The gated action's own page path, carried through from the gate screen (§7a) -- validated same-app-relative before use. Undefined when reached directly (e.g. a nav link), in which case Approved just offers the dashboard. */
  returnTo?: string;
}

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.7): Patient Identity
 * Verification, mirroring Doctor Onboarding's own wizard shape (§2) --
 * derived entirely from real data, never a client-only fake "Draft" record.
 * Materially simpler than Doctor's: a PatientProfile already exists by the
 * time this is reached (created at Choose-Your-Journey, Stage O.5), so
 * there is no "create profile first" step -- just Documents -> Review.
 */
export function IdentityVerificationFlow({ returnTo }: IdentityVerificationFlowProps) {
  const t = useTranslations('patient.identityVerification');
  const router = useRouter();
  const { data: profile, isLoading: profileLoading, isError: profileError } = usePatientProfile();
  const { data: verifications, isLoading: verificationsLoading } = useMyPatientVerifications(profile?.id);

  const [step, setStep] = useState<WizardStep>('documents');
  const [documents, setDocuments] = useState<DocumentSlots>({});
  const [resubmitting, setResubmitting] = useState(false);

  const latestCase = useMemo(() => verifications?.[0], [verifications]);

  if (profileLoading || (profile && verificationsLoading)) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (profileError || !profile) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  // A decided case blocks re-entering the wizard unless it was Rejected/
  // MoreInfoNeeded and the applicant explicitly asked to edit and resubmit.
  if (latestCase && !resubmitting) {
    return (
      <VerificationStatus
        verificationCase={latestCase}
        translationNamespace="patient.identityVerification.status"
        onEditAndResubmit={
          latestCase.status === 'rejected' || latestCase.status === 'more_info_needed'
            ? () => {
                setResubmitting(true);
                setStep('documents');
              }
            : undefined
        }
        approvedAction={
          <Button asChild>
            <Link href={returnTo ?? '/patient'}>{returnTo ? t('status.continueAction') : t('status.goToDashboard')}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex items-center gap-2 text-xs text-text-tertiary">
        <li aria-current={step === 'documents' ? 'step' : undefined} className={step === 'documents' ? 'font-semibold text-primary' : ''}>
          {t('steps.documents')}
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current={step === 'review' ? 'step' : undefined} className={step === 'review' ? 'font-semibold text-primary' : ''}>
          {t('steps.review')}
        </li>
      </ol>

      {step === 'documents' && (
        <DocumentsStep
          slots={PATIENT_DOCUMENT_SLOTS}
          translationNamespace="patient.identityVerification.documentsStep"
          documents={documents}
          onDocumentsChange={setDocuments}
          onBack={() => router.push('/patient')}
          onContinue={() => setStep('review')}
        />
      )}

      {step === 'review' && (
        <PatientReviewStep
          patientProfileId={profile.id}
          documents={documents}
          onBack={() => setStep('documents')}
          onSubmitted={() => setResubmitting(false)}
        />
      )}
    </div>
  );
}
