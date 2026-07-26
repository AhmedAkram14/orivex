'use client';

import { CalendarHeart, Stethoscope } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useChoosePatientJourney } from '@/features/journey/hooks/use-choose-patient-journey';
import { Icon } from '@/shared/icons/icon';
import { useRouter } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { cn } from '@/shared/lib/cn';

type JourneyIntent = 'patient' | 'doctor';

function readIntent(value: string | null): JourneyIntent | undefined {
  return value === 'patient' || value === 'doctor' ? value : undefined;
}

/**
 * "Choose Your Journey" (Onboarding Redesign, 2026-07-21 proposal, §1/§2) --
 * two large cards, not a form, shown exactly once (the shared `/dashboard`
 * page redirects here only while the account has neither a DoctorProfile
 * nor a PatientProfile row, per §3's gating rule). Pre-selects a card when
 * arriving with `?intent=patient|doctor` (§1a, a future landing page's CTA
 * query param) -- highlighted only, never auto-submitted, since intent can
 * change between click and signup.
 *
 * Choosing "book appointments" creates a bare PatientProfile immediately
 * (useChoosePatientJourney's explicit GET /patients/me call), then routes
 * into the mandatory Personal Info + Medical Information intake
 * (`/patient/intake`, product follow-up 2026-07-26 -- supersedes this
 * file's original "no onboarding wizard in between" design). Choosing
 * "practice as a Doctor" routes straight into the existing Doctor
 * Onboarding wizard (`/doctor/onboarding`), which creates the DoctorProfile
 * itself; nothing needs to happen here first.
 */
export function JourneyScreen() {
  const t = useTranslations('journey');
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselected = readIntent(searchParams.get('intent'));
  const choosePatientJourney = useChoosePatientJourney();

  async function handleChoosePatient() {
    await choosePatientJourney.mutateAsync();
    router.push('/patient/intake');
  }

  function handleChooseDoctor() {
    router.push('/doctor/onboarding');
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 py-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">{t('title')}</h1>
        <p className="text-text-secondary">{t('description')}</p>
      </div>

      {choosePatientJourney.isError && <Alert variant="danger">{t('choosePatientError')}</Alert>}

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className={cn('flex flex-col', preselected === 'patient' && 'ring-2 ring-primary')}>
          <CardHeader>
            <Icon icon={CalendarHeart} size="lg" className="text-primary" />
            <CardTitle>{t('patientCardTitle')}</CardTitle>
            <CardDescription>{t('patientCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button className="w-full" loading={choosePatientJourney.isPending} onClick={handleChoosePatient}>
              {t('patientCardAction')}
            </Button>
          </CardContent>
        </Card>

        <Card className={cn('flex flex-col', preselected === 'doctor' && 'ring-2 ring-primary')}>
          <CardHeader>
            <Icon icon={Stethoscope} size="lg" className="text-primary" />
            <CardTitle>{t('doctorCardTitle')}</CardTitle>
            <CardDescription>{t('doctorCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button className="w-full" variant="outline" onClick={handleChooseDoctor}>
              {t('doctorCardAction')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
