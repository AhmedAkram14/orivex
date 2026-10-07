import { Search, Stethoscope, UserPlus } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { LandingSection } from '@/features/landing/components/landing-section';
import { loadOrNull, publicSiteApi } from '@/features/public-site/api/public-site-api';
import { CtaBand } from '@/features/public-site/components/cta-band';
import { DoctorGridSkeleton } from '@/features/public-site/components/doctor-search/doctor-card-skeleton';
import { DoctorSearch } from '@/features/public-site/components/doctor-search/doctor-search';
import { PageHero } from '@/features/public-site/components/page-hero';
import { PublicBreadcrumbs } from '@/features/public-site/components/public-breadcrumbs';
import { toPublicDoctorQuery } from '@/features/public-site/lib/doctor-search-params';
import { Link } from '@/shared/i18n/navigation';
import type { AppLocale } from '@/shared/i18n/routing';
import { Icon } from '@/shared/icons/icon';
import { buildPageMetadata } from '@/shared/lib/seo';
import { Button } from '@/shared/ui/button';
import { Container } from '@/shared/ui/container';

export const revalidate = 300;

type PageProps = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'publicSite.doctorsPage.meta' });
  return buildPageMetadata({ locale, path: '/doctors', title: t('title'), description: t('description') });
}

/**
 * The public doctor directory. The page itself is static (ISR) and ships the
 * unfiltered first page of results; every filter, the sort and the page
 * number live in the URL and are applied client-side by `DoctorSearch`.
 */
export default async function DoctorsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'publicSite.doctorsPage' });

  const [specialties, initialDoctors] = await Promise.all([
    loadOrNull(() => publicSiteApi.getSpecialties()),
    loadOrNull(() => publicSiteApi.getDoctors(toPublicDoctorQuery({}, undefined))),
  ]);
  const totalDoctors = specialties?.reduce((sum, specialty) => sum + specialty.doctorCount, 0);

  return (
    <main id="main-content">
      <PageHero
        size="xl"
        breadcrumbs={<PublicBreadcrumbs locale={locale} items={[{ label: t('breadcrumb') }]} />}
        label={t('hero.label')}
        icon={Stethoscope}
        title={t('hero.title')}
        subtitle={totalDoctors ? t('hero.subtitleWithCount', { count: totalDoctors, specialties: specialties?.filter((s) => s.doctorCount > 0).length ?? 0 }) : t('hero.subtitle')}
      />

      <LandingSection fullTop aria-label={t('resultsLabel')}>
        <Container size="xl">
          <Suspense fallback={<DoctorGridSkeleton />}>
            <DoctorSearch
              fields={['specialty', 'availability', 'fee', 'experience', 'rank', 'rating', 'practice']}
              specialties={specialties?.filter((specialty) => specialty.doctorCount > 0) ?? []}
              showNameSearch
              initialData={initialDoctors}
            />
          </Suspense>
        </Container>
      </LandingSection>

      <CtaBand
        title={t('cta.title')}
        description={t('cta.description')}
        actions={
          <>
            <Button asChild size="lg">
              <Link href="/specialties">
                <Icon icon={Search} size="sm" />
                {t('cta.primary')}
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/for-doctors">
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
