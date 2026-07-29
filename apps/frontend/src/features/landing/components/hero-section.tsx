import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Display, Text } from '@/design-system/typography';
import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';
import { Container } from '@/shared/ui/container';
import { Logo } from '@/shared/ui/logo';

/**
 * The landing page's opening section. Both CTAs go straight into the real,
 * already-working booking flow (`/patient/doctors`) or doctor onboarding
 * (`/register` -- doctor onboarding itself starts post-registration at
 * `/doctor/onboarding`, so this is the correct real entry point, not a
 * placeholder) -- neither is a dead link, both simply require signing in
 * first if the visitor isn't already, exactly like every other deep link
 * on this page.
 */
export function HeroSection() {
  const t = useTranslations('landing.hero');

  return (
    <Container size="lg" className="grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
      <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-start">
        <Logo size="lg" />
        <Display className="text-balance">{t('headline')}</Display>
        <Text size="lg" tone="secondary" className="max-w-lg text-balance">
          {t('subheadline')}
        </Text>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/patient/doctors">{t('primaryCta')}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/register">{t('secondaryCta')}</Link>
          </Button>
        </div>
      </div>
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl shadow-lg">
        <Image
          src="/hero.jpg"
          alt={t('imageAlt')}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
    </Container>
  );
}
