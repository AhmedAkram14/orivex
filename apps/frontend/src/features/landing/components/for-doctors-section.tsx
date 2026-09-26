'use client';

import { ArrowRight, Check, LayoutDashboard, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Heading, Text } from '@/design-system/typography';
import { useAuth } from '@/shared/auth/auth-context';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { Container } from '@/shared/ui/container';
import { Illustration } from '@/shared/ui/illustrations/illustration';

const BULLET_KEYS = [
  'flexibleSchedule',
  'videoConsultations',
  'digitalPrescriptions',
  'securePayments',
  'growPractice',
] as const;

/**
 * A full-bleed ink band (in dark mode the tokens invert it to a light band).
 * The pulse-filled CTA is the section's one accent. The old flattened image
 * is gone -- the panel beside the copy is a live scene.
 */
export function ForDoctorsSection() {
  const t = useTranslations('landing.forDoctors');
  const tNav = useTranslations('landing.nav');
  const tUi = useTranslations('landingUi');
  const { status } = useAuth();
  const isAuthenticated = status === 'authenticated';

  return (
    <section id="for-doctors" className="scroll-mt-16 bg-text-primary py-20 text-text-inverse">
      <Container size="lg">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-5 lg:order-2">
            <Heading as="h2" level={2} className="text-text-inverse">{t('title')}</Heading>
            <Text className="max-w-prose text-text-inverse/80">{t('description')}</Text>
            <ul className="flex flex-col gap-3">
              {BULLET_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-pulse">
                    <Icon icon={Check} size="xs" className="text-pulse-foreground" />
                  </span>
                  <Text size="sm" className="text-text-inverse/90">{t(`bullets.${key}`)}</Text>
                </li>
              ))}
            </ul>
            <Button asChild variant="accent" size="lg" className="mt-2 w-fit gap-2">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Icon icon={LayoutDashboard} size="sm" />
                  {tNav('goToDashboard')}
                </Link>
              ) : (
                <Link href="/register">
                  <Icon icon={UserPlus} size="sm" />
                  {t('cta')}
                  <Icon icon={ArrowRight} size="sm" flipRtl />
                </Link>
              )}
            </Button>
          </div>

          <div className="flex flex-col items-center gap-3 rounded-(--r-hero) bg-surface/10 p-8 lg:order-1">
            <Illustration name="verified-seal" className="size-48 text-text-inverse" />
            <p className="text-h3 text-text-inverse">{tUi('doctorPanelTitle')}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
