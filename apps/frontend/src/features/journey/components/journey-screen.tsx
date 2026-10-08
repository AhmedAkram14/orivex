'use client';

import { Check, Info, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useId, useRef, useState, type KeyboardEvent } from 'react';

import { useChoosePatientJourney } from '@/features/journey/hooks/use-choose-patient-journey';
import { FocusedHeader } from '@/features/journey/components/focused-header';
import { useAuth } from '@/shared/auth/auth-context';
import { useRouter } from '@/shared/i18n/navigation';
import { useDirection } from '@/shared/i18n/use-direction';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Illustration, type IllustrationKey } from '@/shared/ui/illustrations/illustration';

type JourneyIntent = 'patient' | 'doctor';

function readIntent(value: string | null): JourneyIntent | undefined {
  return value === 'patient' || value === 'doctor' ? value : undefined;
}

function firstNameOf(fullName: string | undefined): string | undefined {
  return fullName?.trim().split(/\s+/)[0] || undefined;
}

// The doctor onboarding wizard's own steps (features/doctor/components/onboarding/onboarding-flow.tsx: Personal
// info, Professional info, Documents, Review & submit), after which an admin reviews the license. No duration is
// defined anywhere, so the card states the steps rather than a time estimate.
const DOCTOR_ONBOARDING_STEPS = 4;

// Three benefits a side, each a real, shipped feature: verified doctors (admin verification), video visits
// (Telemedicine), health records; weekly hours with per-day fees (Scheduling), secure video, and Stripe as the
// bound payment gateway (PaymentModule). Doctors have no payout feature yet (Earnings: "recorded earnings, not
// payouts"), so the doctor side says fees are processed through Stripe, not that doctors get paid through it.
const ROLES: Record<JourneyIntent, { illustration: IllustrationKey; benefits: readonly string[]; selectedBand: string }> = {
  patient: { illustration: 'role-patient', benefits: ['book', 'video', 'records'], selectedBand: 'bg-warm-1/60' },
  doctor: { illustration: 'role-doctor', benefits: ['hours', 'video', 'payments'], selectedBand: 'bg-pulse/16' },
};
const ORDER: JourneyIntent[] = ['patient', 'doctor'];

/**
 * "Choose Your Journey" -- shown once, after sign-up, while the account has neither a DoctorProfile nor a
 * PatientProfile (the shared `/dashboard` page is the only thing that redirects here). Owns its own chrome
 * (logo, help link, account menu) outside the dashboard `AppShell`, since there is nothing to navigate to yet.
 *
 * One radio group of two equal cards and one Continue button that follows the selection, so the choice is
 * never biased by button weight. Nothing is pre-selected unless the visitor arrived with `?intent=patient|doctor`
 * (highlighted only, never auto-submitted, since intent can change between click and sign-up).
 *
 * Continue keeps the two existing actions exactly: as a patient it creates the bare PatientProfile
 * (useChoosePatientJourney's explicit GET /patients/me) and goes to the intake (`/patient/intake`); as a doctor it
 * goes straight to the Doctor Onboarding wizard (`/doctor/onboarding`), which creates the DoctorProfile itself.
 */
export function JourneyScreen() {
  const t = useTranslations('journey');
  const router = useRouter();
  const direction = useDirection();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<JourneyIntent | undefined>(() => readIntent(searchParams.get('intent')));
  const [focusable, setFocusable] = useState<JourneyIntent>(selected ?? 'patient');
  const cardRefs = useRef<Record<JourneyIntent, HTMLDivElement | null>>({ patient: null, doctor: null });
  const choosePatientJourney = useChoosePatientJourney();
  const titleId = useId();
  const firstName = firstNameOf(user?.fullName);

  async function handleContinue() {
    if (selected === 'patient') {
      await choosePatientJourney.mutateAsync();
      router.push('/patient/intake');
    } else if (selected === 'doctor') {
      router.push('/doctor/onboarding');
    }
  }

  function moveFocus(to: JourneyIntent) {
    setFocusable(to);
    cardRefs.current[to]?.focus();
  }

  // Arrows move between the two cards (in reading direction), Space/Enter selects the focused one.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, role: JourneyIntent) {
    const index = ORDER.indexOf(role);
    const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward || event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocus(ORDER[(index + 1) % ORDER.length]!);
    } else if (event.key === backward || event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(ORDER[(index + ORDER.length - 1) % ORDER.length]!);
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      setSelected(role);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface-subtle">
      <FocusedHeader />

      <main className="mx-auto flex w-full max-w-220 flex-1 flex-col items-center gap-5 px-4 pt-2 sm:justify-center sm:gap-6 sm:px-6 sm:pb-10">
        <div className="flex flex-col items-center gap-2 text-center sm:gap-3">
          <Badge variant="neutral" className="px-3 py-1 text-sm">
            {firstName ? t('eyebrow', { name: firstName }) : t('eyebrowNoName')}
          </Badge>
          <h1 id={titleId} className="font-display text-[1.75rem]/9 font-bold text-text-primary sm:text-[2.5rem]/12">
            {t('title')}
          </h1>
          <p className="max-w-xl text-sm text-text-secondary sm:text-base">{t('description')}</p>
        </div>

        {choosePatientJourney.isError && (
          <Alert variant="danger" className="w-full">
            {t('choosePatientError')}
          </Alert>
        )}

        <div role="radiogroup" aria-labelledby={titleId} className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
          {ORDER.map((role) => {
            const { illustration, benefits, selectedBand } = ROLES[role];
            const checked = selected === role;
            return (
              <div
                key={role}
                ref={(element) => {
                  cardRefs.current[role] = element;
                }}
                role="radio"
                aria-checked={checked}
                aria-labelledby={`${titleId}-${role}`}
                aria-describedby={`${titleId}-${role}-description`}
                tabIndex={focusable === role ? 0 : -1}
                data-journey-role={role}
                onClick={() => {
                  setSelected(role);
                  setFocusable(role);
                }}
                onKeyDown={(event) => handleKeyDown(event, role)}
                className={cn(
                  'group relative flex cursor-pointer overflow-hidden rounded-2xl border bg-surface text-start transition-[border-color,box-shadow,translate] duration-(--duration-fast) motion-reduce:transition-none',
                  'max-sm:items-center max-sm:gap-3 max-sm:p-3 sm:flex-col',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                  checked
                    ? 'border-text-primary ring-1 ring-text-primary'
                    : 'border-border-default hover:-translate-y-px hover:border-text-primary/30',
                )}
              >
                {/* The radio indicator, top-end: an empty ring, or filled ink with a check once chosen. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute end-3 top-3 flex size-5 items-center justify-center rounded-full border sm:end-4 sm:top-4 sm:size-6',
                    checked ? 'border-text-primary bg-text-primary text-text-inverse' : 'border-border-strong bg-surface',
                  )}
                >
                  {checked && <Icon icon={Check} size="xs" className="stroke-3" />}
                </span>

                <div
                  className={cn(
                    'flex shrink-0 items-center justify-center transition-colors duration-(--duration-fast)',
                    'max-sm:size-14 max-sm:rounded-xl sm:h-24 sm:w-full lg:h-30',
                    checked ? selectedBand : 'bg-surface-2',
                  )}
                >
                  <Illustration name={illustration} className="size-14 sm:size-24 lg:size-30" />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1 max-sm:pe-7 sm:gap-3 sm:p-5">
                  <div className="flex flex-col gap-0.5 sm:gap-1">
                    <h2 id={`${titleId}-${role}`} className="text-base font-semibold text-text-primary sm:text-lg">
                      {t(`${role}.title`)}
                    </h2>
                    <p id={`${titleId}-${role}-description`} className="text-sm text-text-secondary">
                      {t(`${role}.description`)}
                    </p>
                  </div>
                  <ul className="hidden flex-col gap-1.5 sm:flex">
                    {benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2 text-sm text-text-primary">
                        <Icon icon={Check} size="sm" className="mt-0.5 shrink-0 text-text-primary" />
                        <span className="line-clamp-2">{t(`${role}.benefits.${benefit}`)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="truncate text-xs font-medium text-text-primary sm:hidden">{t(`${role}.summary`)}</p>
                  {role === 'doctor' && (
                    <p className="flex items-start gap-1.5 text-xs text-text-tertiary">
                      <Icon icon={Info} size="xs" className="mt-px shrink-0" />
                      {t('doctor.verification', { count: DOCTOR_ONBOARDING_STEPS })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Continue: below the cards on desktop, pinned to the bottom of the screen on a phone. */}
        <div className="flex w-full flex-col items-center gap-3 max-sm:sticky max-sm:bottom-0 max-sm:-mx-4 max-sm:mt-auto max-sm:w-[calc(100%+2rem)] max-sm:border-t max-sm:border-border-default max-sm:bg-surface-subtle max-sm:px-4 max-sm:pt-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            size="lg"
            data-journey-continue=""
            className="w-full sm:w-80"
            disabled={!selected}
            loading={choosePatientJourney.isPending}
            onClick={handleContinue}
          >
            {selected ? t(`${selected}.continue`) : t('continue')}
          </Button>
          <p className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <Icon icon={ShieldCheck} size="xs" className="shrink-0" />
            {t('trustLine')}
          </p>
        </div>
      </main>
    </div>
  );
}
