import { LayoutGrid, Search, Stethoscope, UserPlus, Users } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LandingSection } from '@/features/landing/components/landing-section';
import { loadOrNull, publicSiteApi } from '@/features/public-site/api/public-site-api';
import { CtaBand } from '@/features/public-site/components/cta-band';
import { PageHero } from '@/features/public-site/components/page-hero';
import { PublicBreadcrumbs } from '@/features/public-site/components/public-breadcrumbs';
import { SectionHeader } from '@/features/public-site/components/section-header';
import { SpecialtyGrid, SpecialtySearchInput, SpecialtySearchProvider } from '@/features/public-site/components/specialties/specialty-search';
import { SymptomGuide } from '@/features/public-site/components/specialties/symptom-guide';
import { Link } from '@/shared/i18n/navigation';
import type { AppLocale } from '@/shared/i18n/routing';
import { Icon } from '@/shared/icons/icon';
import { buildPageMetadata } from '@/shared/lib/seo';
import { Button } from '@/shared/ui/button';
import { Container } from '@/shared/ui/container';
import { ErrorState } from '@/shared/ui/error-state';

export const revalidate = 300;

type PageProps = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'publicSite.specialtiesPage.meta' });
  return buildPageMetadata({ locale, path: '/specialties', title: t('title'), description: t('description') });
}

function HeroStat({ icon, value, label }: { icon: typeof Users; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface">
        <Icon icon={icon} size="md" className="text-text-secondary" />
      </span>
      <span className="flex flex-col text-start">
        <span data-numeric className="font-display text-metric text-text-primary">
          {value}
        </span>
        <span className="text-small text-text-tertiary">{label}</span>
      </span>
    </div>
  );
}

/**
 * Every active specialty from `GET /public/specialties`, each with its real
 * verified-doctor count. Specialties with no doctors yet are still listed
 * (their page explains that and points elsewhere) -- the index is the
 * catalogue, the homepage is the shop window.
 */
export default async function SpecialtiesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'publicSite.specialtiesPage' });
  const specialties = await loadOrNull(() => publicSiteApi.getSpecialties());

  const sorted = specialties
    ? [...specialties].sort((a, b) => b.doctorCount - a.doctorCount || a.name.localeCompare(b.name))
    : null;
  const totalDoctors = sorted?.reduce((sum, specialty) => sum + specialty.doctorCount, 0) ?? 0;

  return (
    <main id="main-content">
      <SpecialtySearchProvider>
        <PageHero
          breadcrumbs={<PublicBreadcrumbs locale={locale} items={[{ label: t('breadcrumb') }]} />}
          label={t('hero.label')}
          icon={LayoutGrid}
          title={t('hero.title')}
          subtitle={t('hero.subtitle')}
          footer={
            sorted && sorted.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-8 pt-2">
                <HeroStat icon={Stethoscope} value={sorted.length} label={t('hero.specialtiesStat')} />
                <HeroStat icon={Users} value={totalDoctors} label={t('hero.doctorsStat')} />
              </div>
            ) : undefined
          }
        >
          <SpecialtySearchInput />
        </PageHero>

        <LandingSection fullTop aria-labelledby="all-specialties-title">
          <Container size="lg" className="flex flex-col gap-(--section-head-gap)">
            <SectionHeader align="start" title={t('grid.title')} subtitle={t('grid.subtitle')} titleId="all-specialties-title" />
            {sorted ? <SpecialtyGrid specialties={sorted} /> : <ErrorState title={t('grid.errorTitle')} description={t('grid.errorDescription')} />}
          </Container>
        </LandingSection>
      </SpecialtySearchProvider>

      {sorted && sorted.length > 0 && (
        <LandingSection aria-labelledby="symptom-guide-title">
          <Container size="lg">
            <SymptomGuide specialties={sorted} />
          </Container>
        </LandingSection>
      )}

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
            <Button asChild size="lg" variant="secondary">
              <Link href="/register">
                <Icon icon={UserPlus} size="sm" />
                {t('cta.secondary')}
              </Link>
            </Button>
          </>
        }
      />
    </main>
  );
}
