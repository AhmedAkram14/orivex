'use client';

import { Search, ShieldCheck, Stethoscope, UserPlus, Users } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { usePublicSpecialties } from '@/features/landing/hooks/use-public-specialties';
import { Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';
import { Container } from '@/shared/ui/container';

/**
 * The landing page's opening section: copy + CTAs on a light ground (this
 * page's normal canvas background, not a full-bleed photo), a real stats
 * row, and a static illustration of a video consultation on the right with
 * a soft decorative blob behind it. The stats row deliberately shows only
 * the two figures this platform can actually back with real data --
 * Verified Doctors and Specialties, both derived from the same
 * `GET /public/specialties` response the Browse Specialties section uses.
 * No "Happy Patients" or "Platform Uptime" style figure is shown; neither
 * is backed by any real, publicly-exposed metric.
 */
export function HeroSection() {
  const t = useTranslations('landing.hero');
  const { data: specialties } = usePublicSpecialties();
  const visible = specialties?.filter((specialty) => specialty.doctorCount > 0) ?? [];
  const totalDoctors = visible.reduce((sum, specialty) => sum + specialty.doctorCount, 0);

  return (
    <Container size="lg" className="pb-16 pt-28 lg:pb-24 lg:pt-32">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-start">
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle">
              <Icon icon={ShieldCheck} size="sm" className="text-primary" />
            </span>
            <Text size="sm" tone="secondary">
              {t('trustLine')}
            </Text>
          </div>

          <h1 className="text-balance text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
            {t('headlineLine1')}
            <br />
            <span className="text-primary">{t('headlineLine2')}</span>
          </h1>

          <Text size="lg" tone="secondary" className="max-w-lg text-balance">
            {t('subheadline')}
          </Text>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/patient/doctors">
                <Icon icon={Search} size="sm" />
                {t('primaryCta')}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/register">
                <Icon icon={UserPlus} size="sm" />
                {t('secondaryCta')}
              </Link>
            </Button>
          </div>

          {visible.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-8 pt-2 sm:justify-start">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-subtle">
                  <Icon icon={Users} size="md" className="text-success" />
                </span>
                <div className="flex flex-col text-start">
                  <span className="text-lg font-bold text-text-primary">{totalDoctors}+</span>
                  <Text size="sm" tone="tertiary">
                    {t('doctorsStat')}
                  </Text>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle">
                  <Icon icon={Stethoscope} size="md" className="text-primary" />
                </span>
                <div className="flex flex-col text-start">
                  <span className="text-lg font-bold text-text-primary">{visible.length}+</span>
                  <Text size="sm" tone="tertiary">
                    {t('specialtiesStat')}
                  </Text>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative flex items-center justify-center">
          {/* Decorative blurred shape behind the illustration -- existing token color only, no new hue. */}
          <div
            className="absolute end-0 top-1/2 -z-10 size-[26rem] -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl shadow-xl">
            <Image
              src="/updated-hero.png"
              alt={t('imageAlt')}
              width={1536}
              height={1024}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="h-auto w-full"
            />
          </div>
        </div>
      </div>
    </Container>
  );
}
