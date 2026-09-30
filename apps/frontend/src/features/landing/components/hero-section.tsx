'use client';

import { ArrowRight, LayoutDashboard, Search, ShieldCheck, Stethoscope, UserPlus, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { Display, Text } from '@/design-system/typography';
import { usePublicSpecialties } from '@/features/landing/hooks/use-public-specialties';
import { useAuth } from '@/shared/auth/auth-context';
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
  const tNav = useTranslations('landing.nav');
  const tUi = useTranslations('landingUi');
  const { status, user } = useAuth();
  const { data: specialties } = usePublicSpecialties();
  const visible = specialties?.filter((specialty) => specialty.doctorCount > 0) ?? [];
  const totalDoctors = visible.reduce((sum, specialty) => sum + specialty.doctorCount, 0);
  const isAuthenticated = status === 'authenticated';
  const isPatient = user?.roles.includes('patient') ?? false;

  return (
    <Container size="lg" className="pb-20 pt-24 lg:pb-28 lg:pt-28">
      <div className="grid grid-cols-1 items-center gap-10 pt-10 lg:grid-cols-2 lg:gap-14">
        <div className="flex flex-col items-center gap-7 text-center lg:items-start lg:text-start">
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2">
              <Icon icon={ShieldCheck} size="sm" className="text-text-secondary" />
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
          <Display as="h1" className="text-balance text-4xl text-text-primary sm:text-display-hero">
            {t('headlineLine1')}
            <br />
            <span className="rounded-md bg-pulse px-2 text-pulse-foreground box-decoration-clone">{t('headlineLine2')}</span>
          </Display>

          <Text size="lg" tone="secondary" className="max-w-md text-balance">
            {t('subheadline')}
          </Text>

          <div className="flex flex-col gap-4 sm:flex-row">
            {isAuthenticated && !isPatient ? (
              <Button asChild size="lg">
                <Link href="/dashboard">
                  <Icon icon={LayoutDashboard} size="sm" />
                  {tNav('goToDashboard')}
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/patient/doctors">
                    <Icon icon={Search} size="sm" />
                    {t('primaryCta')}
                  </Link>
                </Button>
                {isAuthenticated ? (
                  <Button asChild size="lg" variant="secondary">
                    <Link href="/dashboard">
                      <Icon icon={LayoutDashboard} size="sm" />
                      {tNav('goToDashboard')}
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg" variant="secondary">
                    <Link href="/register">
                      <Icon icon={UserPlus} size="sm" />
                      {t('secondaryCta')}
                    </Link>
                  </Button>
                )}
              </>
            )}
          </div>

          {visible.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-8 pt-4 sm:justify-start">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-2">
                  <Icon icon={Users} size="md" className="text-text-secondary" />
                </span>
                <div className="flex flex-col text-start">
                  <span data-numeric className="font-display text-metric text-text-primary">{totalDoctors}+</span>
                  <Text size="sm" tone="tertiary">
                    {t('doctorsStat')}
                  </Text>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-2">
                  <Icon icon={Stethoscope} size="md" className="text-text-secondary" />
                </span>
                <div className="flex flex-col text-start">
                  <span data-numeric className="font-display text-metric text-text-primary">{visible.length}+</span>
                  <Text size="sm" tone="tertiary">
                    {t('specialtiesStat')}
                  </Text>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative flex flex-col items-center justify-center">
          {/* Decorative blurred shape behind the illustration -- existing token color only, no new hue. Clipped sideways on its own layer (not the whole column), so the card below can overhang the photo's edge. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-x-clip">
            <div className="absolute -end-8 top-6 size-80 rounded-full bg-primary/15 blur-2xl" />
          </div>
          <div className="relative w-full overflow-hidden rounded-(--r-hero) border border-border-default shadow-md">
            <Image
              src="/hero-1.png"
              alt={t('imageAlt')}
              width={1600}
              height={983}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="h-auto w-full"
            />
            {/* The photo has English labels baked in at its top-left. A blurred pad hides them and the labels below are live, translated text -- pinned to the physical left over that pad (the photo isn't mirrored), so in Arabic they don't land on the photo's top-right buttons. */}
            <div aria-hidden="true" className="absolute left-0 top-0 h-[14%] w-[24%] backdrop-blur-2xl" />
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-text-primary/70 px-3 py-1 text-caption font-semibold text-text-inverse backdrop-blur-sm">
              <span aria-hidden="true" className="size-2 rounded-full bg-pulse" />
              {tUi('videoLabel')} · {tUi('live')}
            </div>
          </div>
          {/*
            The "priority" card is live text (translated, real link), not a flattened image. From `sm` it
            hangs off the photo's bottom-right corner, 24px below the frame (and, from `lg`, 24px past its
            right edge), in the one free patch of the photo: right of the call controls (which end at 64%
            of its width) and below the patient's picture-in-picture (which ends at 44% of its height). Its
            width is a share of the photo's so it stays clear of the controls at every size. Physical
            `right`, not `end`, on purpose: the photo is not mirrored in Arabic. Below `sm` the photo is too
            short to overlay, so the card follows it instead.
          */}
          <div className="relative mt-3 w-full rounded-(--r-card) border border-border-default bg-surface p-4 shadow-md sm:absolute sm:right-3 sm:-bottom-6 sm:mt-0 sm:w-[calc(35%-1rem)] sm:max-w-[13.75rem] sm:p-3.5 lg:-right-6 lg:w-[calc(35%+1rem)]">
            <div className="flex items-start gap-2">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-text-primary" />
              <p className="text-h3 text-text-primary">{tUi('cardTitle')}</p>
            </div>
            <p className="mt-1 text-small text-text-secondary">
              {tUi('cardLineOne')} {tUi('cardLineTwo')} {tUi('cardLineThree')}
            </p>
            <Link href="#how-it-works" className="mt-2 inline-flex items-center gap-1 text-small font-semibold text-care-text hover:underline">
              {tUi('cardCta')}
              <Icon icon={ArrowRight} size="sm" flipRtl />
            </Link>
          </div>
        </div>
      </div>
    </Container>
  );
}
