'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePatientProfile } from '@/features/patient/hooks/use-patient-profile';
import { useMyPatientVerifications } from '@/features/patient/hooks/use-my-patient-verifications';
import { PatientReviewStep } from '@/features/patient/components/identity-verification/patient-review-step';
import { FocusedPage } from '@/features/journey/components/focused-page';
import { Link, useRouter } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { StepProgress } from '@/shared/ui/step-progress';
import { DocumentsStep, type DocumentSlots } from '@/shared/verification/components/documents-step';
import { VerificationStatus } from '@/shared/verification/components/verification-status';
import type { MediaAssetPurpose } from '@/shared/media/types';

const STEPS = ['documents', 'review'] as const;
type WizardStep = (typeof STEPS)[number];

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
 *
 * The same focused page as the other onboarding flows, with an Exit back to where the patient came from.
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
  const exitHref = returnTo ?? '/patient';
  const stepIndex = STEPS.indexOf(step);
  const allDocuments = PATIENT_DOCUMENT_SLOTS.every((slot) => documents[slot]);

  if (profileLoading || (profile && verificationsLoading)) {
    return (
      <FocusedPage exitHref={exitHref}>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </FocusedPage>
    );
  }

  if (profileError || !profile) {
    return (
      <FocusedPage exitHref={exitHref}>
        <Alert variant="danger">{t('loadError')}</Alert>
      </FocusedPage>
    );
  }

  // A decided case blocks re-entering the wizard unless it was Rejected/
  // MoreInfoNeeded and the applicant explicitly asked to edit and resubmit.
  if (latestCase && !resubmitting) {
    return (
      <FocusedPage exitHref={exitHref}>
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
          pendingAction={
            <Button asChild variant="secondary">
              <Link href={exitHref}>{returnTo ? t('status.backToWhereYouWere') : t('status.goToDashboard')}</Link>
            </Button>
          }
          approvedAction={
            <Button asChild>
              <Link href={exitHref}>{returnTo ? t('status.continueAction') : t('status.goToDashboard')}</Link>
            </Button>
          }
        />
      </FocusedPage>
    );
  }

  return (
    <FocusedPage
      exitHref={exitHref}
      intro={
        <div className="flex flex-col gap-3 sm:gap-5">
          <StepProgress
            label={t('progressLabel')}
            currentIndex={stepIndex}
            maxReachableIndex={allDocuments ? 1 : 0}
            onStepSelect={(index) => setStep(STEPS[index]!)}
            compactLabel={t('stepOf', { current: stepIndex + 1, total: STEPS.length, label: t(`steps.${step}`) })}
            steps={STEPS.map((key) => ({ key, label: t(`steps.${key}`) }))}
          />
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[1.625rem]/8 font-bold text-text-primary sm:text-[2rem]/10">{t('title')}</h1>
            <p className="text-sm text-text-secondary sm:text-base">{t('description')}</p>
          </div>
        </div>
      }
    >
      <div hidden={step !== 'documents'}>
        <DocumentsStep
          slots={PATIENT_DOCUMENT_SLOTS}
          translationNamespace="patient.identityVerification.documentsStep"
          documents={documents}
          onDocumentsChange={setDocuments}
          onBack={() => router.push(exitHref)}
          onContinue={() => setStep('review')}
        />
      </div>

      {step === 'review' && (
        <PatientReviewStep
          patientProfileId={profile.id}
          documents={documents}
          slots={PATIENT_DOCUMENT_SLOTS}
          onBack={() => setStep('documents')}
          onSubmitted={() => setResubmitting(false)}
        />
      )}
    </FocusedPage>
  );
}
