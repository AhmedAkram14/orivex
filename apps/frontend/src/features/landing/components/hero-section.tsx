import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Text } from '@/design-system/typography';
import { SearchSection } from '@/features/landing/components/search-section';
import { Container } from '@/shared/ui/container';

/**
 * The landing page's opening section: the hero photo fills the entire
 * section (full viewport height on large screens), with a dark tint over
 * it so the white headline/subheadline stay readable against whatever
 * part of the photo sits behind them. `LandingNavbar` is fixed, so it
 * floats on top of this section regardless of scroll position -- the
 * generous top padding here just keeps the headline clear of it on load.
 * The search pill IS the primary call to action -- it submits straight
 * into the real, already-working Doctor Directory (`/patient/doctors`),
 * never a dead end.
 */
export function HeroSection() {
  const t = useTranslations('landing.hero');

  return (
    <div className="relative flex min-h-160 w-full items-center overflow-hidden lg:min-h-screen">
      <Image
        src="/hero.jpg"
        alt={t('imageAlt')}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Dark tint over the photo -- keeps the white headline/subheadline/CTA readable against any part of the image, at any viewport size. */}
      <div className="absolute inset-0 bg-text-primary/60" aria-hidden="true" />

      <Container size="lg" className="relative z-10 py-28">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center lg:mx-0 lg:items-start lg:text-start">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {t('headline')}
          </h1>
          <Text size="lg" className="max-w-lg text-balance text-white/85">
            {t('subheadline')}
          </Text>
          <SearchSection />
        </div>
      </Container>
    </div>
  );
}
