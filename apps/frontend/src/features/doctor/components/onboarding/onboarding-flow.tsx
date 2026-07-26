'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDoctorProfile } from '@/features/doctor/hooks/use-doctor-profile';
import { useMyVerifications } from '@/features/doctor/hooks/use-my-verifications';
import type { DoctorProfile } from '@/features/doctor/api/types';
import { ProfileStep } from '@/features/doctor/components/onboarding/profile-step';
import { ReviewStep } from '@/features/doctor/components/onboarding/review-step';
import { PersonalInfoStep } from '@/features/identity/components/personal-info-step';
import { useMyAccount } from '@/features/identity/hooks/use-my-account';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Skeleton } from '@/shared/ui/skeleton';
import { DocumentsStep, type DocumentSlots } from '@/shared/verification/components/documents-step';
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

// Onboarding Redesign (2026-07-21 proposal, Stage O.6): 'personal' is the
// new leading step (the shared Personal Info step, §0a). The resume logic
// below is unchanged from before this step existed -- an existing
// DoctorProfile with nothing submitted yet still resumes at 'documents'
// (personal + professional info were both necessarily already completed to
// reach that state in the first place, since the wizard is strictly
// sequential); only the *first-time-through* default moved from 'profile'
// to 'personal'.
type WizardStep = 'personal' | 'profile' | 'documents' | 'review';

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
 *   ReVerificationDue -> Pending (blocked from re-entering the wizard).
 * - Latest is Rejected -> shows the reason, offers "Edit and resubmit"
 *   which re-enters the wizard at step 1 with the existing profile
 *   pre-filled.
 * - Latest is Approved -> the account has already been promoted to Doctor
 *   by `PromoteDoctorRoleOnVerificationHandler`; this view is only ever
 *   seen if the applicant navigates back here directly.
 */
export function OnboardingFlow() {
  const t = useTranslations('doctor.onboarding');
  const { data: account, isLoading: accountLoading } = useMyAccount();
  const { data: profile, isLoading: profileLoading, error: profileError } = useDoctorProfile();
  const hasProfile = Boolean(profile);
  const { data: verifications, isLoading: verificationsLoading } = useMyVerifications(profile?.id);

  const [step, setStep] = useState<WizardStep>('personal');
  const [documents, setDocuments] = useState<DocumentSlots>({});
  const [resubmitting, setResubmitting] = useState(false);
  const [workingProfile, setWorkingProfile] = useState<DoctorProfile | undefined>(undefined);

  const profileNotFound = profileError instanceof ApiError && profileError.status === 404;

  const latestCase = useMemo(() => verifications?.[0], [verifications]);

  // Resume at the right step exactly once, the moment real data first
  // becomes available -- a profile that already exists with nothing
  // submitted yet (Draft) resumes at Documents, never forces the applicant
  // back through Profile again. Deliberately a one-shot effect (not a
  // reactive derivation) so it never fights the user's own Back navigation
  // once the wizard is showing.
  const hasResumedRef = useRef(false);
  useEffect(() => {
    if (hasResumedRef.current) return;
    if (profileLoading || (hasProfile && verificationsLoading)) return;
    hasResumedRef.current = true;
    if (hasProfile && (!verifications || verifications.length === 0)) {
      setStep('documents');
    }
  }, [profileLoading, hasProfile, verificationsLoading, verifications]);

  if (accountLoading || profileLoading || (hasProfile && verificationsLoading)) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (profileError && !profileNotFound) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  const effectiveProfile = workingProfile ?? profile;

  // A decided case blocks re-entering the wizard unless it was Rejected/
  // MoreInfoNeeded and the applicant explicitly asked to edit + resubmit.
  if (latestCase && !resubmitting) {
    return (
      <VerificationStatus
        verificationCase={latestCase}
        translationNamespace="doctor.onboarding.status"
        onEditAndResubmit={
          latestCase.status === 'rejected' || latestCase.status === 'more_info_needed'
            ? () => {
                setResubmitting(true);
                setStep('profile');
              }
            : undefined
        }
        approvedAction={
          <Button asChild>
            <Link href="/doctor">{t('status.goToDoctorPortal')}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex items-center gap-2 text-xs text-text-tertiary">
        <li aria-current={step === 'personal' ? 'step' : undefined} className={step === 'personal' ? 'font-semibold text-primary' : ''}>
          {t('steps.personal')}
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current={step === 'profile' ? 'step' : undefined} className={step === 'profile' ? 'font-semibold text-primary' : ''}>
          {t('steps.profile')}
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current={step === 'documents' ? 'step' : undefined} className={step === 'documents' ? 'font-semibold text-primary' : ''}>
          {t('steps.documents')}
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current={step === 'review' ? 'step' : undefined} className={step === 'review' ? 'font-semibold text-primary' : ''}>
          {t('steps.review')}
        </li>
      </ol>

      {step === 'personal' && (
        <PersonalInfoStep account={account} onSaved={() => setStep('profile')} />
      )}

      {step === 'profile' && (
        <ProfileStep
          profile={effectiveProfile}
          onSaved={(saved) => {
            setWorkingProfile(saved);
            setStep('documents');
          }}
        />
      )}

      {step === 'documents' && (
        <DocumentsStep
          slots={DOCTOR_DOCUMENT_SLOTS}
          translationNamespace="doctor.onboarding.documentsStep"
          documents={documents}
          onDocumentsChange={setDocuments}
          onBack={() => setStep('profile')}
          onContinue={() => setStep('review')}
        />
      )}

      {step === 'review' && effectiveProfile && (
        <ReviewStep
          profile={effectiveProfile}
          documents={documents}
          onBack={() => setStep('documents')}
          onSubmitted={() => {
            setResubmitting(false);
          }}
        />
      )}
    </div>
  );
}
