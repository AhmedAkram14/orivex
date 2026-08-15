'use client';

import {
  Calendar,
  CheckCircle2,
  Headphones,
  Lock,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

import { Heading } from '@/design-system/typography';
import { useChoosePatientJourney } from '@/features/journey/hooks/use-choose-patient-journey';
import { UserMenu } from '@/features/shell/components/user-menu';
import { useRouter } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Logo } from '@/shared/ui/logo';

type JourneyIntent = 'patient' | 'doctor';

function readIntent(value: string | null): JourneyIntent | undefined {
  return value === 'patient' || value === 'doctor' ? value : undefined;
}

// Every bullet names a real, already-implemented feature (browse/book via
// DoctorProfileController + AppointmentController, video consultations via
// the Telemedicine module, digital prescriptions via PrescriptionController,
// health records via the Health Graph, doctor Patients/Reports pages) --
// nothing aspirational, same honesty rule the landing page's own feature
// lists already follow.
const PATIENT_FEATURE_KEYS = [
  'browseDoctors',
  'bookAppointments',
  'videoConsultations',
  'digitalPrescriptions',
  'healthRecords',
  'labResults',
] as const;
const DOCTOR_FEATURE_KEYS = [
  'manageAppointments',
  'videoConsultations',
  'digitalPrescriptions',
  'patientManagement',
  'reportsInsights',
  'growPractice',
] as const;

// Real mechanisms only, same honesty rule `SecurityTrustSection` documents
// on the landing page -- deliberately excludes "HIPAA Compliant" (a US
// regulation this Egypt-based platform has no certification for) and any
// "trusted by N users" claim (no real, publicly-exposed user-count metric
// exists to back one).
const TRUST_ITEMS = [
  { key: 'dataSecurity', icon: ShieldCheck },
  { key: 'accessControl', icon: Lock },
  { key: 'builtForHealthcare', icon: Users },
] as const;

/**
 * "Choose Your Journey" (Onboarding Redesign, 2026-07-21 proposal, §1/§2;
 * visually redesigned 2026-08-02 to match a premium two-card reference
 * layout) -- two large illustrated cards, not a form, shown exactly once
 * (the shared `/dashboard` page redirects here only while the account has
 * neither a DoctorProfile nor a PatientProfile row, per §3's gating rule).
 * Owns its own full-page chrome (logo, help link, account menu) -- this
 * screen deliberately renders outside the dashboard `AppShell` (see
 * `app/[locale]/journey/layout.tsx`), since there is nothing to navigate to
 * in a sidebar yet. Pre-selects a card when arriving with
 * `?intent=patient|doctor` (§1a, a future landing page's CTA query param) --
 * highlighted only, never auto-submitted, since intent can change between
 * click and signup.
 *
 * Choosing "book appointments" creates a bare PatientProfile immediately
 * (useChoosePatientJourney's explicit GET /patients/me call), then routes
 * into the mandatory Personal Info + Medical Information intake
 * (`/patient/intake`). Choosing "practice as a Doctor" routes straight into
 * the existing Doctor Onboarding wizard (`/doctor/onboarding`), which
 * creates the DoctorProfile itself; nothing needs to happen here first.
 */
export function JourneyScreen() {
  const t = useTranslations('journey');
  const tCommon = useTranslations('common');
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
    <div className="min-h-dvh bg-surface-subtle">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-text-primary">
          <Logo size="sm" />
          {tCommon('appName')}
        </div>
        <div className="flex items-center gap-6">
          <a href="mailto:ahmed.akram7474@gmail.com" className="hidden items-center gap-2 sm:flex">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary-emphasis">
              <Icon icon={Headphones} size="sm" />
            </span>
            <span className="flex flex-col text-sm">
              <span className="text-text-secondary">{t('needHelp')}</span>
              <span className="font-medium text-primary">{t('contactSupport')}</span>
            </span>
          </a>
          <UserMenu showName />
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-16 pt-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Badge variant="primary" className="px-3 py-1 text-sm">
            {t('eyebrow')}
          </Badge>
          <h1 className="max-w-2xl text-3xl font-bold text-text-primary sm:text-4xl">
            {t('title')}
          </h1>
          <p className="max-w-xl text-text-secondary">{t('description')}</p>
        </div>

        {choosePatientJourney.isError && <Alert variant="danger">{t('choosePatientError')}</Alert>}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            className={cn(
              'flex flex-col overflow-hidden rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]',
              preselected === 'patient' && 'ring-2 ring-primary',
            )}
          >
            <div className="relative flex h-64 items-center justify-center overflow-hidden bg-primary-subtle/40 ">
              <span className="absolute start-6 top-6 flex size-11 items-center justify-center rounded-2xl bg-surface text-primary shadow-sm">
                <Icon icon={Calendar} size="md" />
              </span>
              <div className="relative h-full w-full">
                <Image
                  src="/patient-onboarding.png"
                  alt=""
                  fill
                  sizes="480px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <CardContent className="flex flex-1 flex-col gap-4 p-6 sm:p-8">
              <div className="flex flex-col gap-1.5">
                <Heading as="h2" level={3}>{t('patientCardTitle')}</Heading>
                <p className="text-sm text-text-secondary">{t('patientCardDescription')}</p>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {PATIENT_FEATURE_KEYS.map((key) => (
                  <span key={key} className="flex items-center gap-2 text-sm text-text-secondary">
                    <Icon icon={CheckCircle2} size="sm" className="shrink-0 text-primary" />
                    {t(`features.${key}`)}
                  </span>
                ))}
              </div>
              <Button
                className="mt-auto w-full"
                loading={choosePatientJourney.isPending}
                onClick={handleChoosePatient}
              >
                {t('patientCardAction')}
              </Button>
            </CardContent>
          </Card>

          <Card
            className={cn(
              'flex flex-col overflow-hidden rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]',
              preselected === 'doctor' && 'ring-2 ring-success',
            )}
          >
            <div className="relative flex h-64 items-center justify-center overflow-hidden bg-success-subtle/40 ">
              <span className="absolute start-6 top-6 flex size-11 items-center justify-center rounded-2xl bg-surface text-success shadow-sm">
                <Icon icon={Stethoscope} size="md" />
              </span>
              <div className="relative h-full w-full">
                <Image
                  src="/doctor-onboarding.png"
                  alt=""
                  fill
                  sizes="480px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <CardContent className="flex flex-1 flex-col gap-4 p-6 sm:p-8">
              <div className="flex flex-col gap-1.5">
                <Heading as="h2" level={3}>{t('doctorCardTitle')}</Heading>
                <p className="text-sm text-text-secondary">{t('doctorCardDescription')}</p>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {DOCTOR_FEATURE_KEYS.map((key) => (
                  <span key={key} className="flex items-center gap-2 text-sm text-text-secondary">
                    <Icon icon={CheckCircle2} size="sm" className="shrink-0 text-success" />
                    {t(`features.${key}`)}
                  </span>
                ))}
              </div>
              <Button className="mt-auto w-full" variant="outline" onClick={handleChooseDoctor}>
                {t('doctorCardAction')}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col items-center gap-6 border-t border-border-default pt-8 sm:flex-row sm:justify-center sm:gap-10">
          {TRUST_ITEMS.map(({ key, icon }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary-subtle text-text-secondary">
                <Icon icon={icon} size="md" />
              </span>
              <div className="flex flex-col text-start">
                <span className="text-sm font-medium text-text-primary">
                  {t(`trust.${key}.title`)}
                </span>
                <span className="text-xs text-text-tertiary">{t(`trust.${key}.description`)}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
