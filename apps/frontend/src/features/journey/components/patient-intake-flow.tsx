'use client';

import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { EssentialInfoStep } from '@/features/identity/components/essential-info-step';
import { useMyAccount } from '@/features/identity/hooks/use-my-account';
import { FocusedPage } from '@/features/journey/components/focused-page';
import { useRouter } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Illustration } from '@/shared/ui/illustrations/illustration';
import { Skeleton } from '@/shared/ui/skeleton';
import { StepProgress } from '@/shared/ui/step-progress';

/**
 * Patient intake (product decision, 2026-09): one short step -- date of birth, gender and phone, the only things
 * booking truly needs -- before the dashboard opens. Everything else (nationality, address, blood type, allergies,
 * chronic conditions, emergency contact, insurance) is an optional nudge on the Overview; allergies are asked right
 * before a first booking.
 *
 * A focused page like role selection (step 1 of the same flow): its own header, no sidebar, one card. No "Back":
 * choosing "I'm a patient" already created the patient profile, and going back would not undo it (applying as a
 * doctor stays one click away in the account menu).
 */
export function PatientIntakeFlow() {
  const t = useTranslations('journey.intake');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: account, isLoading, isError } = useMyAccount();

  async function handleSaved() {
    await queryClient.invalidateQueries({ queryKey: ['journey-status'] });
    router.push('/patient');
  }

  const trustLine = (
    <p className="flex items-start justify-center gap-1.5 text-center text-xs text-text-tertiary">
      <Icon icon={ShieldCheck} size="xs" className="mt-px shrink-0" />
      {t('trustLine')}
    </p>
  );

  return (
    <FocusedPage width="narrow" className="max-sm:px-0">
        <div className="flex flex-col gap-3 px-4 sm:gap-5 sm:px-0">
          <StepProgress
            label={t('progressLabel')}
            compactLabel={t('stepOf', { current: 2, total: 2 })}
            currentIndex={1}
            steps={[
              { key: 'role', label: t('steps.role') },
              { key: 'details', label: t('steps.details') },
            ]}
          />
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[1.625rem]/8 font-bold text-text-primary sm:text-[2rem]/10">{t('title')}</h1>
            <p className="text-sm text-text-secondary sm:text-base">{t('subtitle')}</p>
          </div>
        </div>

        {/* The card: full-bleed on a phone (its button pinned to the bottom), a bordered 520px card from sm. */}
        <section className="flex flex-1 flex-col bg-surface px-4 pt-5 sm:flex-none sm:rounded-(--r-card) sm:border sm:border-border-default sm:p-8">
          <Illustration name="id-check" size={72} className="mb-5 max-sm:hidden" />
          {isLoading ? (
            <div className="flex flex-col gap-5">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : isError || !account ? (
            <Alert variant="danger">{t('loadError')}</Alert>
          ) : (
            <EssentialInfoStep account={account} onSaved={handleSaved} footnote={trustLine} />
          )}
        </section>

        <div className="max-sm:hidden">{trustLine}</div>
    </FocusedPage>
  );
}
