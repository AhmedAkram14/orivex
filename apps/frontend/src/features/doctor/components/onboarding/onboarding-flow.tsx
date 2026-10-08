'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDoctorProfile } from '@/features/doctor/hooks/use-doctor-profile';
import { useMyVerifications } from '@/features/doctor/hooks/use-my-verifications';
import type { DoctorProfile } from '@/features/doctor/api/types';
import { ProfileStep } from '@/features/doctor/components/onboarding/profile-step';
import {
  ReviewStep,
  type ReviewEditTarget,
} from '@/features/doctor/components/onboarding/review-step';
import { PersonalInfoStep } from '@/features/identity/components/personal-info-step';
import { useMyAccount } from '@/features/identity/hooks/use-my-account';
import { FocusedPage } from '@/features/journey/components/focused-page';
import { Alert } from '@/shared/ui/alert';
import { Skeleton } from '@/shared/ui/skeleton';
import { StepProgress } from '@/shared/ui/step-progress';
import {
  DocumentsStep,
  type DocumentGroup,
  type DocumentSlots,
} from '@/shared/verification/components/documents-step';
import { VerificationStatus } from '@/shared/verification/components/verification-status';
import type { MediaAssetPurpose } from '@/shared/media/types';
import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';

// Onboarding Redesign (2026-07-21 proposal, Stage O.3/O.6): 7 typed upload
// slots, each its own MediaAssetPurpose value. Order matches §2's UX table.
const DOCTOR_DOCUMENT_SLOTS: readonly MediaAssetPurpose[] = [
  'national_id_front',
  'national_id_back',
  'selfie_with_id',
  'medical_license',
  'graduation_certificate',
  'board_certificate',
  'professional_membership_card',
];
const DOCTOR_DOCUMENT_GROUPS: readonly DocumentGroup[] = [
  { key: 'identity', slots: ['national_id_front', 'national_id_back', 'selfie_with_id'] },
  {
    key: 'qualifications',
    slots: [
      'medical_license',
      'graduation_certificate',
      'board_certificate',
      'professional_membership_card',
    ],
  },
];

const STEPS = ['personal', 'profile', 'documents', 'review'] as const;
type WizardStep = (typeof STEPS)[number];

/**
 * Doctor Onboarding (Phase 4 continuation) -- the entire self-service
 * workflow as one state machine, derived entirely from real data (never a
 * client-only fake "Draft" record):
 *
 * - No DoctorProfile yet -> Draft, step 1 (shared Personal Info, then
 *   Professional Info/create profile).
 * - DoctorProfile exists, no VerificationCase ever submitted -> Draft,
 *   continues at the Documents step (personal + professional info were
 *   both necessarily completed already to reach this state).
 * - Latest VerificationCase is Submitted/UnderReview/MoreInfoNeeded/
 *   ReVerificationDue -> Pending (the status screen replaces the form).
 * - Latest is Rejected -> shows the reason, offers "Edit and resubmit"
 *   which re-enters the wizard with the existing profile pre-filled.
 * - Latest is Approved -> the account has already been promoted to Doctor
 *   by `PromoteDoctorRoleOnVerificationHandler`; this view is only ever
 *   seen if the applicant navigates back here directly.
 *
 * A focused page (no app shell): the header names the application's state, the stepper's completed steps are
 * buttons, and every step stays mounted while the applicant moves around, so going back never loses what they typed.
 * "Edit" on Review jumps to that step and returns to Review once it's saved.
 */
export function OnboardingFlow() {
  const t = useTranslations('doctor.onboarding');
  const { data: account, isLoading: accountLoading } = useMyAccount();
  const { data: profile, isLoading: profileLoading, isError: profileError } = useDoctorProfile();
  const hasProfile = Boolean(profile);
  const { data: verifications, isLoading: verificationsLoading } = useMyVerifications(profile?.id);

  const [step, setStep] = useState<WizardStep>('personal');
  const [furthest, setFurthest] = useState(0);
  const [documents, setDocuments] = useState<DocumentSlots>({});
  const [resubmitting, setResubmitting] = useState(false);
  const [workingProfile, setWorkingProfile] = useState<DoctorProfile | undefined>(undefined);
  const [returnToReview, setReturnToReview] = useState(false);

  const latestCase = useMemo(() => verifications?.[0], [verifications]);

  function goTo(next: WizardStep) {
    setStep(next);
    setFurthest((current) => Math.max(current, STEPS.indexOf(next)));
    if (typeof document !== 'undefined' && document.scrollingElement)
      document.scrollingElement.scrollTop = 0;
  }

  function afterSave(next: WizardStep) {
    if (returnToReview) {
      setReturnToReview(false);
      goTo('review');
    } else {
      goTo(next);
    }
  }

  // Resume at the right step exactly once, the moment real data first
  // becomes available -- a profile that already exists with nothing
  // submitted yet (Draft) resumes at Documents, never forces the applicant
  // back through Profile again. Deliberately a one-shot effect (not a
  // reactive derivation) so it never fights the user's own Back navigation.
  const hasResumedRef = useRef(false);
  useEffect(() => {
    if (hasResumedRef.current) return;
    if (profileLoading || (hasProfile && verificationsLoading)) return;
    hasResumedRef.current = true;
    if (hasProfile && (!verifications || verifications.length === 0)) {
      setStep('documents');
      setFurthest(2);
    }
  }, [profileLoading, hasProfile, verificationsLoading, verifications]);

  const status = latestCase && !resubmitting ? latestCase.status : undefined;
  const subtitle =
    status === undefined
      ? t('applicationStatus.inProgress')
      : status === 'rejected' || status === 'more_info_needed'
        ? t('applicationStatus.needsChanges')
        : status === 'approved'
          ? t('applicationStatus.approved')
          : t('applicationStatus.underReview');

  const loading = accountLoading || profileLoading || (hasProfile && verificationsLoading);
  const effectiveProfile = workingProfile ?? profile ?? undefined;
  const stepIndex = STEPS.indexOf(step);
  const allDocuments = DOCTOR_DOCUMENT_SLOTS.every((slot) => documents[slot]);
  // How far the stepper may jump: steps already reached, but never past what the data allows.
  const maxReachable = Math.min(furthest, !effectiveProfile ? 1 : !allDocuments ? 2 : 3);

  const intro = (title: string, description: string) => (
    <div className="flex flex-col gap-3 sm:gap-5">
      <StepProgress
        label={t('progressLabel')}
        currentIndex={stepIndex}
        maxReachableIndex={maxReachable}
        onStepSelect={(index) => goTo(STEPS[index]!)}
        compactLabel={t('stepOf', {
          current: stepIndex + 1,
          total: STEPS.length,
          label: t(`steps.${step}`),
        })}
        steps={STEPS.map((key) => ({ key, label: t(`steps.${key}`) }))}
      />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[1.625rem]/8 font-bold text-text-primary sm:text-[2rem]/10">
          {title}
        </h1>
        <p className="text-sm text-text-secondary sm:text-base">{description}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <FocusedPage subtitle={subtitle} exitHref="/patient">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </FocusedPage>
    );
  }

  if (profileError) {
    return (
      <FocusedPage subtitle={subtitle} exitHref="/patient">
        <Alert variant="danger">{t('loadError')}</Alert>
      </FocusedPage>
    );
  }

  // A decided or pending case replaces the form unless it was Rejected/MoreInfoNeeded and the applicant explicitly
  // asked to edit and resubmit.
  if (latestCase && !resubmitting) {
    return (
      <FocusedPage subtitle={subtitle} exitHref="/patient">
        <VerificationStatus
          verificationCase={latestCase}
          translationNamespace="doctor.onboarding.status"
          onEditAndResubmit={
            latestCase.status === 'rejected' || latestCase.status === 'more_info_needed'
              ? () => {
                  setResubmitting(true);
                  goTo('profile');
                }
              : undefined
          }
          pendingAction={
            <Button asChild variant="secondary">
              <Link href="/patient">{t('status.goToDashboard')}</Link>
            </Button>
          }
          approvedAction={
            <Button asChild>
              <Link href="/doctor">{t('status.goToDoctorPortal')}</Link>
            </Button>
          }
        />
      </FocusedPage>
    );
  }

  return (
    <FocusedPage
      subtitle={subtitle}
      exitHref="/patient"
      intro={intro(t(`stepTitles.${step}`), t(`stepDescriptions.${step}`))}
    >
      {/* Every step stays mounted (hidden when not current) so moving back and forth keeps unsaved edits. */}
      <div hidden={step !== 'personal'}>
        <PersonalInfoStep
          account={account}
          actions="bar"
          submitLabel={t('continue')}
          onSaved={() => afterSave('profile')}
        />
      </div>

      <div hidden={step !== 'profile'}>
        <ProfileStep
          profile={effectiveProfile}
          submitLabel={t('continue')}
          onBack={() => goTo('personal')}
          onSaved={(saved) => {
            setWorkingProfile(saved);
            afterSave('documents');
          }}
        />
      </div>

      <div hidden={step !== 'documents'}>
        <DocumentsStep
          slots={DOCTOR_DOCUMENT_SLOTS}
          groups={DOCTOR_DOCUMENT_GROUPS}
          translationNamespace="doctor.onboarding.documentsStep"
          documents={documents}
          onDocumentsChange={setDocuments}
          onBack={() => goTo('profile')}
          onContinue={() => afterSave('review')}
        />
      </div>

      {step === 'review' && effectiveProfile && (
        <ReviewStep
          account={account}
          profile={effectiveProfile}
          documents={documents}
          slots={DOCTOR_DOCUMENT_SLOTS}
          onBack={() => goTo('documents')}
          onEdit={(target: ReviewEditTarget) => {
            setReturnToReview(true);
            goTo(target);
          }}
          onSubmitted={() => {
            setResubmitting(false);
          }}
        />
      )}
    </FocusedPage>
  );
}
