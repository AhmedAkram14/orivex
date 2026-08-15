'use client';

import { Search, ShieldCheck, Stethoscope, UserPlus, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { Display, Text } from '@/design-system/typography';
import { usePublicSpecialties } from '@/features/landing/hooks/use-public-specialties';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
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
 *
 * The illustration is two separate flattened images: `/hero-1.png` (the
 * video-consultation panel -- call controls, labels, and icons all baked
 * in, so it's rendered at its own native ratio rather than cropped) and
 * `/hero-2.png` (the floating "Your Health, Our Priority" card, which
 * already has its own transparent, rounded edges), absolutely positioned
 * overlapping the main panel's bottom-end corner.
 */
export function HeroSection() {
  const t = useTranslations('landing.hero');
  const { data: specialties } = usePublicSpecialties();
  const visible = specialties?.filter((specialty) => specialty.doctorCount > 0) ?? [];
  const totalDoctors = visible.reduce((sum, specialty) => sum + specialty.doctorCount, 0);

  return (
    <Container size="lg" className="pb-20 pt-24 lg:pb-28 lg:pt-28">
      <div className="grid grid-cols-1 items-center gap-10 pt-10 lg:grid-cols-2 lg:gap-14">
        <div className="flex flex-col items-center gap-7 text-center lg:items-start lg:text-start">
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle">
              <Icon icon={ShieldCheck} size="sm" className="text-primary" />
            </span>
            <Text size="sm" tone="secondary">
              {t('trustLine')}
            </Text>
          </div>

          {/* Hero-scale headline via the Display primitive, capped at the
              design system's documented text-5xl token (the largest size
              typography.css actually defines) rather than reaching for
              Tailwind's un-tokenized text-6xl -- this is the one place on
              the page large-scale type is appropriate, so it's the one
              place Display (not Heading) is used. */}
          <Display as="h1" className="text-balance text-4xl text-text-primary sm:text-5xl">
            {t('headlineLine1')}
            <br />
            <span className="text-primary">{t('headlineLine2')}</span>
          </Display>

          <Text size="lg" tone="secondary" className="max-w-md text-balance">
            {t('subheadline')}
          </Text>

          <div className="flex flex-col gap-4 sm:flex-row">
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
            <div className="flex flex-wrap items-center justify-center gap-8 pt-4 sm:justify-start">
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

        <div className="relative flex items-center justify-center pb-10">
          {/* Decorative blurred shape behind the illustration -- existing token color only, no new hue. Less blur/spread than before, closer to the reference's tighter glow. */}
          <div
            className="absolute -end-8 top-6 -z-10 size-80 rounded-full bg-primary/15 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative w-full overflow-hidden rounded-2xl border-2 border-white shadow-xl">
            <Image
              src="/hero-1.png"
              alt={t('imageAlt')}
              width={1600}
              height={983}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="h-auto w-full"
            />
          </div>
          {/* w-[32%] is deliberate, not a token gap: this floating card must
              stay a fixed proportion of the main panel it overlaps
              (hero-1.png) so the overlap composition holds at every
              breakpoint -- no fixed-width or scale token expresses "32% of
              my sibling's rendered width". */}
          <div className="absolute -bottom-10 -end-6 w-[32%] drop-shadow-xl">
            <Image src="/hero-2.png" alt={t('cardAlt')} width={1124} height={1133} className="h-auto w-full" />
          </div>
        </div>
      </div>
    </Container>
  );
}
