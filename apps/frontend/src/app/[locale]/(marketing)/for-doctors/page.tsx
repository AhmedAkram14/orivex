import {
  ArrowDown,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  FileText,
  FileUp,
  Info,
  ListChecks,
  Lock,
  LogIn,
  RotateCcw,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserPlus,
  Video,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Metadata } from 'next';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Heading, Text } from '@/design-system/typography';
import { ApplyAsDoctorButton } from '@/features/landing/components/apply-as-doctor-button';
import { EarningsVignette, RequestVignette, TimelineVignette } from '@/features/landing/components/audience-showcase';
import { LandingSection } from '@/features/landing/components/landing-section';
import { loadOrNull, publicSiteApi } from '@/features/public-site/api/public-site-api';
import { CtaBand } from '@/features/public-site/components/cta-band';
import { FaqAccordion } from '@/features/public-site/components/faq-accordion';
import { FeeCalculator } from '@/features/public-site/components/for-doctors/fee-calculator';
import { PageHero } from '@/features/public-site/components/page-hero';
import { PreviewFrame } from '@/features/public-site/components/preview-frame';
import { PublicBreadcrumbs } from '@/features/public-site/components/public-breadcrumbs';
import { SectionHeader } from '@/features/public-site/components/section-header';
import { StepsTimeline } from '@/features/public-site/components/steps-timeline';
import { Link } from '@/shared/i18n/navigation';
import type { AppLocale } from '@/shared/i18n/routing';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { buildPageMetadata } from '@/shared/lib/seo';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Container } from '@/shared/ui/container';

export const revalidate = 300;

type PageProps = { params: Promise<{ locale: AppLocale }> };

const BENEFITS: { key: string; icon: LucideIcon }[] = [
  { key: 'hours', icon: CalendarClock },
  { key: 'video', icon: Video },
  { key: 'earnings', icon: Wallet },
  { key: 'patients', icon: BadgeCheck },
  { key: 'documents', icon: Lock },
];

const WORKSPACE = [
  { key: 'schedule', preview: <TimelineVignette /> },
  { key: 'requests', preview: <RequestVignette /> },
  { key: 'earnings', preview: <EarningsVignette /> },
] as const;

const VERIFICATION_STEPS: { key: string; icon: LucideIcon }[] = [
  { key: 'account', icon: UserPlus },
  { key: 'profile', icon: ClipboardList },
  { key: 'documents', icon: FileUp },
  { key: 'review', icon: SearchCheck },
  { key: 'live', icon: Stethoscope },
];

/** The slots the doctor onboarding wizard really asks for (onboarding-flow.tsx's DOCTOR_DOCUMENT_SLOTS, ID front/back + selfie grouped). */
const DOCUMENTS = ['medicalLicense', 'membershipCard', 'graduationCertificate', 'boardCertificate', 'nationalId', 'selfie'] as const;

const FAQ_KEYS = ['whoCanApply', 'reviewTime', 'commission', 'approval', 'alongsideClinic', 'payments'] as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'publicSite.forDoctorsPage.meta' });
  return buildPageMetadata({ locale, path: '/for-doctors', title: t('title'), description: t('description') });
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

/**
 * Doctor recruitment. Every number on it is real: the platform fee comes from
 * `GET /public/platform-fees` (the same constant the earnings ledger
 * applies) and the calculator starts from the median fee doctors on the
 * platform charge today. Nothing here promises a review time or a payout
 * schedule the product doesn't have.
 */
export default async function ForDoctorsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'publicSite.forDoctorsPage' });
  const format = await getFormatter({ locale });

  const [fees, doctors] = await Promise.all([
    loadOrNull(() => publicSiteApi.getPlatformFees()),
    loadOrNull(() => publicSiteApi.getDoctors({ limit: 100 })),
  ]);
  const medianFee = median((doctors?.doctors ?? []).map((doctor) => doctor.consultationFeeAmount ?? 0).filter((fee) => fee > 0));
  const rate = fees ? format.number(fees.commissionRate, { style: 'percent', maximumFractionDigits: 1 }) : null;

  const faqItems = FAQ_KEYS.filter((key) => key !== 'commission' || rate).map((key) => ({
    id: `faq-${key}`,
    question: t(`faq.items.${key}.question`),
    answer: t(`faq.items.${key}.answer`, { rate: rate ?? '' }),
  }));

  return (
    <main id="main-content">
      <PageHero
        breadcrumbs={<PublicBreadcrumbs locale={locale} items={[{ label: t('breadcrumb') }]} />}
        label={t('hero.label')}
        icon={Stethoscope}
        title={t('hero.title')}
        subtitle={t('hero.subtitle')}
      >
        <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <ApplyAsDoctorButton />
          <Button asChild size="lg" variant="secondary">
            <a href="#verification">
              {t('hero.secondaryCta')}
              <Icon icon={ArrowDown} size="sm" />
            </a>
          </Button>
        </div>
      </PageHero>

      <LandingSection fullTop aria-labelledby="benefits-title">
        <Container size="lg" className="flex flex-col gap-(--section-head-gap)">
          <SectionHeader label={t('benefits.label')} icon={Sparkles} title={t('benefits.title')} subtitle={t('benefits.subtitle')} titleId="benefits-title" />
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map(({ key, icon }) => (
              <li key={key}>
                <Card className="flex h-full flex-col gap-3 p-6">
                  <span className="flex size-11 items-center justify-center rounded-full bg-success-subtle text-success-emphasis">
                    <Icon icon={icon} size="md" />
                  </span>
                  <Heading as="h3" level={4}>
                    {t(`benefits.items.${key}.title`)}
                  </Heading>
                  <Text size="sm" tone="secondary">
                    {t(`benefits.items.${key}.description`)}
                  </Text>
                </Card>
              </li>
            ))}
          </ul>
        </Container>
      </LandingSection>

      <LandingSection aria-labelledby="workspace-title">
        <Container size="lg" className="flex flex-col gap-(--section-head-gap)">
          <SectionHeader label={t('workspace.label')} icon={ClipboardList} title={t('workspace.title')} subtitle={t('workspace.subtitle')} titleId="workspace-title" />
          <p className="sr-only">{t('workspace.previewDescription')}</p>
          <div className="flex flex-col gap-12">
            {WORKSPACE.map(({ key, preview }, index) => (
              <div key={key} className="grid grid-cols-1 items-center gap-6 lg:grid-cols-2 lg:gap-12">
                <PreviewFrame className={cn('mx-auto w-full max-w-md', index % 2 === 1 && 'lg:order-last')}>{preview}</PreviewFrame>
                <div className="flex flex-col gap-3">
                  <Heading as="h3" level={3}>
                    {t(`workspace.${key}.title`)}
                  </Heading>
                  <ul className="flex flex-col gap-2">
                    {(t.raw(`workspace.${key}.points`) as string[]).map((point) => (
                      <li key={point} className="flex items-start gap-2 text-body text-text-secondary">
                        <Icon icon={CheckCircle2} size="sm" className="mt-1 shrink-0 text-success" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </LandingSection>

      <LandingSection aria-labelledby="fees-title">
        <Container size="lg" className="flex flex-col gap-(--section-head-gap)">
          <SectionHeader label={t('fees.label')} icon={Wallet} title={t('fees.title')} subtitle={t('fees.subtitle')} titleId="fees-title" />
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <ul className="flex flex-col gap-3">
              {(t.raw('fees.points') as string[]).map((point) => (
                <li key={point} className="flex items-start gap-3 rounded-(--r-card) border border-border-default bg-surface p-4 text-small text-text-secondary">
                  <Icon icon={ShieldCheck} size="sm" className="mt-0.5 shrink-0 text-primary" />
                  {point}
                </li>
              ))}
            </ul>
            {fees ? (
              <FeeCalculator commissionRate={fees.commissionRate} initialFee={medianFee} />
            ) : (
              <p className="flex items-start gap-2 rounded-md bg-info-subtle p-4 text-small text-info-emphasis">
                <Icon icon={Info} size="sm" className="mt-0.5 shrink-0" />
                {t('fees.unavailable')}
              </p>
            )}
          </div>
        </Container>
      </LandingSection>

      <LandingSection id="verification" className="scroll-mt-24" aria-labelledby="verification-title">
        <Container size="lg" className="flex flex-col gap-(--section-head-gap)">
          <SectionHeader label={t('verification.label')} icon={BadgeCheck} title={t('verification.title')} subtitle={t('verification.subtitle')} titleId="verification-title" />
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <StepsTimeline
              tone="success"
              steps={VERIFICATION_STEPS.map(({ key, icon }) => ({
                key,
                icon,
                title: t(`verification.steps.${key}.title`),
                description: t(`verification.steps.${key}.description`),
              }))}
            />
            <div className="flex flex-col gap-4">
              <Card className="flex flex-col gap-3 p-6">
                <Heading as="h3" level={4} className="flex items-center gap-2">
                  <Icon icon={FileText} size="sm" className="text-primary" />
                  {t('verification.documentsTitle')}
                </Heading>
                <ul className="flex flex-col gap-2">
                  {DOCUMENTS.map((document) => (
                    <li key={document} className="flex items-start gap-2 text-small text-text-secondary">
                      <Icon icon={CheckCircle2} size="sm" className="mt-0.5 shrink-0 text-success" />
                      {t(`verification.documents.${document}`)}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="flex flex-col gap-2 p-6">
                <Heading as="h3" level={4} className="flex items-center gap-2">
                  <Icon icon={RotateCcw} size="sm" className="text-warning-emphasis" />
                  {t('verification.rejectedTitle')}
                </Heading>
                <Text size="sm" tone="secondary">
                  {t('verification.rejectedDescription')}
                </Text>
              </Card>
            </div>
          </div>
        </Container>
      </LandingSection>

      <LandingSection aria-labelledby="requirements-title">
        <Container size="md">
          <Card className="flex flex-col gap-5 p-6 sm:p-8">
            <SectionHeader align="start" label={t('requirements.label')} icon={ListChecks} title={t('requirements.title')} titleId="requirements-title" />
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(t.raw('requirements.items') as string[]).map((item) => (
                <li key={item} className="flex items-start gap-2 text-body text-text-secondary">
                  <Icon icon={CheckCircle2} size="sm" className="mt-1 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </Container>
      </LandingSection>

      <LandingSection aria-labelledby="doctor-faq-title">
        <Container size="md" className="flex flex-col gap-(--section-head-gap)">
          <SectionHeader label={t('faq.label')} icon={CircleHelp} title={t('faq.title')} titleId="doctor-faq-title" />
          <FaqAccordion items={faqItems} />
        </Container>
      </LandingSection>

      <CtaBand
        title={t('cta.title')}
        description={t('cta.description')}
        actions={
          <>
            <ApplyAsDoctorButton />
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">
                <Icon icon={LogIn} size="sm" />
                {t('cta.secondary')}
              </Link>
            </Button>
          </>
        }
      />
    </main>
  );
}
