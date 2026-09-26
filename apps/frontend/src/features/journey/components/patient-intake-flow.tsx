'use client';

import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { Heading } from '@/design-system/typography';
import { EssentialInfoStep } from '@/features/identity/components/essential-info-step';
import { useMyAccount } from '@/features/identity/hooks/use-my-account';
import { useRouter } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { Skeleton } from '@/shared/ui/skeleton';

/**
 * Patient intake (product decision, 2026-09): one short step -- date of birth,
 * gender and phone, the only things booking truly needs -- before the
 * dashboard opens. Everything else (nationality, address, blood type,
 * allergies, chronic conditions, emergency contact, insurance) is an optional
 * nudge on the Overview; allergies are asked right before a first booking.
 * Supersedes the 2026-07-26 two-step Personal + Medical gate.
 */
export function PatientIntakeFlow() {
  const t = useTranslations('journey.intake');
  const tFlow = useTranslations('profileFlow');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: account, isLoading, isError } = useMyAccount();

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-3 py-8">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !account) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  async function handleSaved() {
    await queryClient.invalidateQueries({ queryKey: ['journey-status'] });
    router.push('/patient');
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-8">
      <div className="flex flex-col gap-2 text-center">
        <Heading as="h1" level={2}>{t('title')}</Heading>
        <p className="text-text-secondary">{tFlow('intakeDescription')}</p>
      </div>
      <EssentialInfoStep account={account} onSaved={handleSaved} />
    </div>
  );
}
