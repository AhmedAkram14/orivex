'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { PersonalInfoStep } from '@/features/identity/components/personal-info-step';
import { useMyAccount } from '@/features/identity/hooks/use-my-account';
import { PatientProfileForm } from '@/features/patient/components/profile/patient-profile-form';
import { usePatientProfile } from '@/features/patient/hooks/use-patient-profile';
import { useRouter } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { Skeleton } from '@/shared/ui/skeleton';

type IntakeStep = 'personal' | 'medical';

/**
 * Product follow-up (2026-07-26): a Patient must complete Personal Info
 * (gender/nationality/address, shared step, §0a) and Medical Information
 * (blood type/allergies/chronic conditions, emergency contacts/insurance
 * stay optional) before the Patient Dashboard becomes reachable --
 * superseding the original proposal's "Medical Profile is optional, fill in
 * any time" decision (§3) per explicit product direction. Mirrors the
 * Doctor Onboarding wizard's own step-by-step shape (`onboarding-flow.tsx`)
 * for UI consistency, just two steps instead of four -- no documents/review
 * step here, since Patient identity verification is a separate, later gate
 * (§7a), not part of this intake.
 */
export function PatientIntakeFlow() {
  const t = useTranslations('journey.intake');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: account, isLoading: accountLoading } = useMyAccount();
  const { data: profile, isLoading: profileLoading, isError } = usePatientProfile();
  const [step, setStep] = useState<IntakeStep>('personal');

  // Resume at the medical step if Personal Info was already completed in a
  // prior visit (the account's own gender/nationality/address are already
  // on record) -- never force it again, matching the doctor wizard's own
  // resume-at-the-right-step precedent.
  useEffect(() => {
    if (accountLoading || !account) return;
    if (account.gender && account.nationalityId && account.address) {
      setStep('medical');
    }
  }, [accountLoading, account]);

  if (accountLoading || profileLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !profile) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  async function handleFinished() {
    await queryClient.invalidateQueries({ queryKey: ['journey-status'] });
    router.push('/patient');
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">{t('title')}</h1>
        <p className="text-text-secondary">{t('description')}</p>
      </div>

      <ol className="flex items-center justify-center gap-2 text-xs text-text-tertiary">
        <li aria-current={step === 'personal' ? 'step' : undefined} className={step === 'personal' ? 'font-semibold text-primary' : ''}>
          {t('steps.personal')}
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current={step === 'medical' ? 'step' : undefined} className={step === 'medical' ? 'font-semibold text-primary' : ''}>
          {t('steps.medical')}
        </li>
      </ol>

      {step === 'personal' && <PersonalInfoStep account={account} onSaved={() => setStep('medical')} />}

      {step === 'medical' && (
        <PatientProfileForm profile={profile} onSaved={handleFinished} onCancel={() => setStep('personal')} />
      )}
    </div>
  );
}
