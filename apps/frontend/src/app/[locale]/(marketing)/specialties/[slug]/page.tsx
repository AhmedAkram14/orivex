import { ArrowDown, CheckCircle2, CircleHelp, LayoutGrid, Search, Users } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { Heading, Text } from '@/design-system/typography';
import { LandingSection } from '@/features/landing/components/landing-section';
import { loadOrNull, publicSiteApi } from '@/features/public-site/api/public-site-api';
import { CtaBand } from '@/features/public-site/components/cta-band';
import { DoctorGridSkeleton } from '@/features/public-site/components/doctor-search/doctor-card-skeleton';
import { DoctorSearch } from '@/features/public-site/components/doctor-search/doctor-search';
import { FaqAccordion } from '@/features/public-site/components/faq-accordion';
import { PageHero } from '@/features/public-site/components/page-hero';
import { PublicBreadcrumbs } from '@/features/public-site/components/public-breadcrumbs';
import { SectionHeader } from '@/features/public-site/components/section-header';
import { SpecialtyCard } from '@/features/public-site/components/specialties/specialty-card';
import { toPublicDoctorQuery } from '@/features/public-site/lib/doctor-search-params';
import { getSpecialtyContentKey, SPECIALTY_FAQ_COUNT } from '@/features/public-site/lib/specialty-content';
import { findSpecialtyBySlug, toSpecialtySlug } from '@/features/public-site/lib/specialty-slug';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { Link } from '@/shared/i18n/navigation';
import type { AppLocale } from '@/shared/i18n/routing';
import { Icon } from '@/shared/icons/icon';
import { getSpecialtyStyle } from '@/shared/lib/specialty-palette';
import { buildPageMetadata } from '@/shared/lib/seo';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Container } from '@/shared/ui/container';
import { EmptyState } from '@/shared/ui/empty-state';

export const revalidate = 300;
// A specialty added after the build is rendered on its first request.
export const dynamicParams = true;

type PageProps = { params: Promise<{ locale: AppLocale; slug: string }> };

/** Every active specialty is prebuilt for each locale (the locale comes from the parent segment's params). */
export async function generateStaticParams() {
  const specialties = await loadOrNull(() => publicSiteApi.getSpecialties());
  return (specialties ?? []).map((specialty) => ({ slug: toSpecialtySlug(specialty.name) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const specialties = await loadOrNull(() => publicSiteApi.getSpecialties());
  const specialty = specialties && findSpecialtyBySlug(specialties, slug);
  // The page calls notFound() for an unknown slug, but the app-wide [locale]/loading.tsx boundary means the
  // response has already started streaming with a 200 by then -- so say noindex explicitly.
  if (!specialty) return { robots: { index: false, follow: true } };

  const t = await getTranslations({ locale, namespace: 'publicSite' });
  const name = pickLocalizedName(specialty.name, specialty.nameAr, locale);
  return buildPageMetadata({
    locale,
    path: `/specialties/${slug}`,
    title: t('specialtyPage.meta.title', { specialty: name }),
    description: t('specialtyPage.meta.description', { specialty: name, count: specialty.doctorCount }),
  });
}

export default async function SpecialtyPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const specialties = await loadOrNull(() => publicSiteApi.getSpecialties());
  const specialty = specialties && findSpecialtyBySlug(specialties, slug);
  if (!specialties || !specialty) notFound();

  const t = await getTranslations({ locale, namespace: 'publicSite' });
  const name = pickLocalizedName(specialty.name, specialty.nameAr, locale);
  const contentKey = getSpecialtyContentKey(specialty.name);
  const content = (key: string) => `specialtyContent.${contentKey}.${key}`;
  const conditions = t.raw(content('conditions')) as string[];
  const whenToSee = t.raw(content('whenToSee')) as string[];
  const faqItems = Array.from({ length: SPECIALTY_FAQ_COUNT }, (_, index) => ({
    id: `faq-${index + 1}`,
    question: t(content(`faq.q${index + 1}.question`)),
    answer: t(content(`faq.q${index + 1}.answer`)),
  }));

  const initialDoctors = specialty.doctorCount > 0 ? await loadOrNull(() => publicSiteApi.getDoctors(toPublicDoctorQuery({}, specialty.id))) : null;

  // Most-practiced other specialties first -- those are the ones a visitor can actually book.
  const related = specialties
    .filter((candidate) => candidate.id !== specialty.id)
    .sort((a, b) => b.doctorCount - a.doctorCount)
    .slice(0, 4);

  return (
    <main id="main-content">
      <PageHero
        align="start"
        breadcrumbs={<PublicBreadcrumbs locale={locale} items={[{ label: t('specialtiesPage.breadcrumb'), href: '/specialties' }, { label: name }]} />}
        label={t('specialtyPage.label')}
        icon={getSpecialtyStyle(specialty.name).icon}
        title={name}
        subtitle={t(content('description'))}
        footer={
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 text-small font-semibold text-text-primary">
              <Icon icon={Users} size="sm" className="text-primary" />
              {specialty.doctorCount > 0 ? t('specialtyPage.verifiedDoctors', { count: specialty.doctorCount }) : t('common.noDoctorsYet')}
            </span>
            {specialty.doctorCount > 0 && (
              <Button asChild size="sm">
                <a href="#doctors">
                  {t('specialtyPage.seeDoctors')}
                  <Icon icon={ArrowDown} size="sm" />
                </a>
              </Button>
            )}
          </div>
        }
      />

      <LandingSection fullTop>
        <Container size="lg" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="flex flex-col gap-4 p-6">
            <Heading as="h2" level={3}>
              {t('specialtyPage.conditionsTitle')}
            </Heading>
            <ul className="flex flex-wrap gap-2">
              {conditions.map((condition) => (
                <li key={condition} className="rounded-full bg-primary-subtle px-3 py-1 text-small text-primary-emphasis">
                  {condition}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="flex flex-col gap-4 p-6">
            <Heading as="h2" level={3}>
              {t('specialtyPage.whenToSeeTitle', { specialty: name })}
            </Heading>
            <ul className="flex flex-col gap-2.5">
              {whenToSee.map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-small text-text-secondary">
                  <Icon icon={CheckCircle2} size="sm" className="mt-0.5 shrink-0 text-success" />
                  {reason}
                </li>
              ))}
            </ul>
            <Text size="sm" tone="tertiary">
              {t('common.notMedicalAdvice')}
            </Text>
          </Card>
        </Container>
      </LandingSection>

      <LandingSection id="doctors" className="scroll-mt-24" aria-labelledby="specialty-doctors-title">
        <Container size="lg" className="flex flex-col gap-(--section-head-gap)">
          <SectionHeader align="start" title={t('specialtyPage.doctorsTitle', { specialty: name })} subtitle={t('specialtyPage.doctorsSubtitle')} titleId="specialty-doctors-title" />
          <Suspense fallback={<DoctorGridSkeleton />}>
            <DoctorSearch
              fields={['availability', 'fee', 'rank']}
              fixedSpecialtyId={specialty.id}
              initialData={initialDoctors}
              emptyState={
                <EmptyState
                  illustration="waiting-room-empty"
                  title={t('specialtyPage.emptyTitle', { specialty: name })}
                  description={t('specialtyPage.emptyDescription')}
                  action={
                    <Button asChild variant="secondary">
                      <Link href="/doctors">
                        <Icon icon={Search} size="sm" />
                        {t('specialtyPage.browseAllDoctors')}
                      </Link>
                    </Button>
                  }
                  secondaryAction={
                    <Button asChild variant="ghost">
                      <Link href="/specialties">{t('specialtyPage.otherSpecialties')}</Link>
                    </Button>
                  }
                />
              }
            />
          </Suspense>
        </Container>
      </LandingSection>

      <LandingSection aria-labelledby="specialty-faq-title">
        <Container size="md" className="flex flex-col gap-(--section-head-gap)">
          <SectionHeader label={t('specialtyPage.faqLabel')} icon={CircleHelp} title={t('specialtyPage.faqTitle', { specialty: name })} titleId="specialty-faq-title" />
          <FaqAccordion items={faqItems} />
        </Container>
      </LandingSection>

      {related.length > 0 && (
        <LandingSection aria-labelledby="related-specialties-title">
          <Container size="lg" className="flex flex-col gap-(--section-head-gap)">
            <SectionHeader align="start" label={t('specialtyPage.relatedLabel')} icon={LayoutGrid} title={t('specialtyPage.relatedTitle')} titleId="related-specialties-title" />
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((candidate) => (
                <li key={candidate.id}>
                  <SpecialtyCard specialty={candidate} />
                </li>
              ))}
            </ul>
          </Container>
        </LandingSection>
      )}

      <CtaBand
        title={t('specialtyPage.cta.title')}
        description={t('specialtyPage.cta.description')}
        actions={
          <>
            <Button asChild size="lg">
              <Link href="/doctors">
                <Icon icon={Search} size="sm" />
                {t('specialtyPage.cta.primary')}
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/how-it-works">{t('specialtyPage.cta.secondary')}</Link>
            </Button>
          </>
        }
      />
    </main>
  );
}

