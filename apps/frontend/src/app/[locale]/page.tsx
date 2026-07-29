import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CoreFeaturesSection } from '@/features/landing/components/core-features-section';
import { CtaSection } from '@/features/landing/components/cta-section';
import { FaqSection, FAQ_KEYS } from '@/features/landing/components/faq-section';
import { ForDoctorsSection } from '@/features/landing/components/for-doctors-section';
import { ForPatientsSection } from '@/features/landing/components/for-patients-section';
import { HeroSection } from '@/features/landing/components/hero-section';
import { HowItWorksSection } from '@/features/landing/components/how-it-works-section';
import { LandingFooter } from '@/features/landing/components/landing-footer';
import { LandingNavbar } from '@/features/landing/components/landing-navbar';
import { PopularDoctorsSection } from '@/features/landing/components/popular-doctors-section';
import { SecurityTrustSection } from '@/features/landing/components/security-trust-section';
import { SpecialtiesSection } from '@/features/landing/components/specialties-section';
import { env } from '@/shared/lib/env';
import { buildPageMetadata } from '@/shared/lib/seo';
import type { AppLocale } from '@/shared/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing.hero' });
  return buildPageMetadata({
    locale: locale as AppLocale,
    path: '/',
    title: 'ORIVEX — AI-Powered Healthcare Platform',
    description: t('subheadline'),
  });
}

/**
 * The real public landing page (Phase 6). Every section shows only what
 * the product actually does today -- see the audit backing this page for
 * the full "real vs. not built" breakdown. Sections marked with a live
 * data hook (Browse Specialties, Popular Doctors) call the two new public
 * endpoints (`GET /public/specialties`, `GET /public/doctors`) added
 * specifically so this page never hardcodes what it shows.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing.faq' });

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalOrganization',
    name: 'ORIVEX',
    url: env.appUrl,
    logo: `${env.appUrl}/orivex-icon.png`,
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_KEYS.map((key) => ({
      '@type': 'Question',
      name: t(`items.${key}.question`),
      acceptedAnswer: { '@type': 'Answer', text: t(`items.${key}.answer`) },
    })),
  };

  return (
    <main id="top">
      {/* Static, server-rendered JSON-LD built from this page's own translated copy, not user input. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <LandingNavbar />
      <HeroSection />
      <SpecialtiesSection />
      <PopularDoctorsSection />
      <HowItWorksSection />
      <CoreFeaturesSection />
      <ForPatientsSection />
      <ForDoctorsSection />
      <SecurityTrustSection />
      <FaqSection />
      <CtaSection />
      <LandingFooter />
    </main>
  );
}
