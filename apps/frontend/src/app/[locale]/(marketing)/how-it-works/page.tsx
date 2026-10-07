import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  IdCard,
  Search,
  ShieldCheck,
  Timer,
  UserPlus,
  Video,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Heading, Text } from '@/design-system/typography';
import { ApplyAsDoctorButton } from '@/features/landing/components/apply-as-doctor-button';
import {
  EarningsVignette,
  NextVisitVignette,
  PrescriptionVignette,
  RequestVignette,
  SlotStripVignette,
  TimelineVignette,
} from '@/features/landing/components/audience-showcase';
import { LandingSection } from '@/features/landing/components/landing-section';
import { AudienceTabList, AudienceTabPanel, AudienceTabsProvider } from '@/features/public-site/components/how-it-works/audience-tabs';
import { CtaBand } from '@/features/public-site/components/cta-band';
import { FaqAccordion } from '@/features/public-site/components/faq-accordion';
import { PageHero } from '@/features/public-site/components/page-hero';
import { PreviewFrame } from '@/features/public-site/components/preview-frame';
import { PublicBreadcrumbs } from '@/features/public-site/components/public-breadcrumbs';
import { SectionHeader } from '@/features/public-site/components/section-header';
import { StepsTimeline } from '@/features/public-site/components/steps-timeline';
import { Link } from '@/shared/i18n/navigation';
import type { AppLocale } from '@/shared/i18n/routing';
import { Icon } from '@/shared/icons/icon';
import { JOIN_WINDOW_CLOSES_AFTER_MS, JOIN_WINDOW_OPENS_BEFORE_MS } from '@/shared/lib/consultation/join-window';
import { buildPageMetadata } from '@/shared/lib/seo';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Container } from '@/shared/ui/container';

type PageProps = { params: Promise<{ locale: AppLocale }> };

// The video room's real join window (the same constants the Join button and the token API enforce).
const OPENS_MINUTES = JOIN_WINDOW_OPENS_BEFORE_MS / 60_000;
const CLOSES_MINUTES = JOIN_WINDOW_CLOSES_AFTER_MS / 60_000;

/** The homepage's five patient and six doctor steps (same keys and icons), each with a fuller description here. */
const PATIENT_STEPS: { key: string; icon: LucideIcon; preview?: ReactNode }[] = [
  { key: 'findDoctor', icon: Search },
  { key: 'bookAppointment', icon: CalendarDays, preview: <SlotStripVignette limeOn /> },
  { key: 'identityVerification', icon: ShieldCheck },
  { key: 'videoConsultation', icon: Video, preview: <NextVisitVignette /> },
  { key: 'medicalRecords', icon: FileText, preview: <PrescriptionVignette /> },
];

const DOCTOR_STEPS: { key: string; icon: LucideIcon; preview?: ReactNode }[] = [
  { key: 'register', icon: UserPlus },
  { key: 'verification', icon: IdCard },
  { key: 'manageSchedule', icon: Clock, preview: <TimelineVignette /> },
  { key: 'meetPatients', icon: ClipboardList, preview: <RequestVignette /> },
  { key: 'consult', icon: Video },
  { key: 'managePractice', icon: CalendarCheck, preview: <EarningsVignette /> },
];

const AFTER_BOOKING: { key: string; icon: LucideIcon }[] = [
  { key: 'request', icon: Timer },
  { key: 'confirm', icon: CheckCircle2 },
  { key: 'payment', icon: CreditCard },
  { key: 'video', icon: Video },
  { key: 'prescription', icon: FileText },
];

const FAQ_KEYS = ['install', 'late', 'free', 'records'] as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'publicSite.howItWorksPage.meta' });
  return buildPageMetadata({ locale, path: '/how-it-works', title: t('title'), description: t('description') });
}

export default async function HowItWorksPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'publicSite.howItWorksPage' });

  const toSteps = (audience: 'patients' | 'doctors', steps: typeof PATIENT_STEPS) =>
    steps.map(({ key, icon, preview }) => ({
      key,
      icon,
      title: t(`${audience}.steps.${key}.title`),
      description: t(`${audience}.steps.${key}.description`, { minutes: OPENS_MINUTES }),
      preview: preview ? <PreviewFrame className="max-w-md">{preview}</PreviewFrame> : undefined,
    }));

  const faqItems = FAQ_KEYS.map((key) => ({
    id: `faq-${key}`,
    question: t(`faq.items.${key}.question`),
    answer: t(`faq.items.${key}.answer`, { minutes: CLOSES_MINUTES }),
  }));

  return (
    <main id="main-content">
      <AudienceTabsProvider>
        <PageHero
          breadcrumbs={<PublicBreadcrumbs locale={locale} items={[{ label: t('breadcrumb') }]} />}
          label={t('hero.label')}
          icon={Workflow}
          title={t('hero.title')}
          subtitle={t('hero.subtitle')}
        >
          <AudienceTabList />
        </PageHero>

        <LandingSection fullTop>
          <Container size="lg">
            <AudienceTabPanel audience="patients">
              <div className="flex flex-col gap-(--section-head-gap)">
                <SectionHeader align="start" title={t('patients.title')} />
                <StepsTimeline steps={toSteps('patients', PATIENT_STEPS)} />
              </div>
            </AudienceTabPanel>
            <AudienceTabPanel audience="doctors">
              <div className="flex flex-col gap-(--section-head-gap)">
                <SectionHeader align="start" title={t('doctors.title')} />
                <StepsTimeline tone="success" steps={toSteps('doctors', DOCTOR_STEPS)} />
              </div>
            </AudienceTabPanel>
          </Container>
        </LandingSection>
      </AudienceTabsProvider>

      <LandingSection aria-labelledby="after-booking-title">
        <Container size="lg" className="flex flex-col gap-(--section-head-gap)">
          <SectionHeader
            label={t('afterBooking.label')}
            icon={CalendarCheck}
            title={t('afterBooking.title')}
            subtitle={t('afterBooking.subtitle')}
            titleId="after-booking-title"
          />
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AFTER_BOOKING.map(({ key, icon }, index) => (
              <li key={key}>
                <Card className="flex h-full flex-col gap-3 p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary-emphasis">
                      <Icon icon={icon} size="md" />
                    </span>
                    <span className="text-caption font-semibold text-text-tertiary" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <Heading as="h3" level={4}>
                    {t(`afterBooking.items.${key}.title`)}
                  </Heading>
                  <Text size="sm" tone="secondary">
                    {t(`afterBooking.items.${key}.description`, { minutes: OPENS_MINUTES })}
                  </Text>
                </Card>
              </li>
            ))}
          </ol>
        </Container>
      </LandingSection>

      <LandingSection aria-labelledby="how-faq-title">
        <Container size="md" className="flex flex-col gap-(--section-head-gap)">
          <SectionHeader label={t('faq.label')} icon={CircleHelp} title={t('faq.title')} titleId="how-faq-title" />
          <FaqAccordion items={faqItems} />
        </Container>
      </LandingSection>

      <CtaBand
        title={t('cta.title')}
        description={t('cta.description')}
        actions={
          <>
            <Button asChild size="lg">
              <Link href="/doctors">
                <Icon icon={Search} size="sm" />
                {t('cta.primary')}
              </Link>
            </Button>
            <ApplyAsDoctorButton variant="secondary" />
          </>
        }
      />
    </main>
  );
}
