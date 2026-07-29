import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Text } from '@/design-system/typography';
import { SearchSection } from '@/features/landing/components/search-section';
import { Container } from '@/shared/ui/container';

/**
 * The landing page's opening section: one large rounded card (matching the
 * approved reference layout) holding the headline/subheadline, the real
 * specialty+name search pill (see `SearchSection`), and the hero photo.
 * The search pill IS the primary call to action here -- it submits
 * straight into the real, already-working Doctor Directory
 * (`/patient/doctors`), never a dead end.
 */
export function HeroSection() {
  const t = useTranslations('landing.hero');

  return (
    <Container size="lg" className="pb-8 pt-4">
      <div className="grid grid-cols-1 items-center gap-10 overflow-hidden rounded-3xl bg-surface p-8 shadow-xl sm:p-12 lg:grid-cols-2 lg:p-16">
        <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-start">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
            {t('headline')}
          </h1>
          <Text size="lg" tone="secondary" className="max-w-lg text-balance">
            {t('subheadline')}
          </Text>
          <SearchSection />
        </div>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
          <Image
            src="/hero.jpg"
            alt={t('imageAlt')}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>
    </Container>
  );
}
