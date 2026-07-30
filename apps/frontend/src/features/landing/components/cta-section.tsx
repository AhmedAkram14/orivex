import { ArrowRight, Stethoscope, UserPlus, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Heading, Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Container } from '@/shared/ui/container';

/**
 * The eyebrow badge deliberately says "Join patients and doctors on
 * ORIVEX" rather than a "thousands of..." claim -- there is no real,
 * publicly-exposed user-count metric this platform can back (the same
 * reasoning the Hero and Browse Specialties stats rows already follow).
 */
export function CtaSection() {
  const t = useTranslations('landing.cta');

  return (
    <Container size="lg" className="py-16">
      <div className="relative overflow-hidden rounded-3xl border border-border-default bg-cta-surface p-8 sm:p-12">
        <div
          className="pointer-events-none absolute start-6 top-6 size-16 opacity-40"
          style={{ backgroundImage: 'radial-gradient(var(--color-border-strong) 1px, transparent 1px)', backgroundSize: '10px 10px' }}
          aria-hidden="true"
        />

        <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-5">
            <Badge variant="primary" className="gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
              <Icon icon={Users} size="xs" />
              {t('eyebrow')}
            </Badge>

            <Heading level={1} className="text-4xl sm:text-5xl">
              {t('title')}
            </Heading>

            <Text size="lg" tone="secondary" className="max-w-md">
              {t('description')}
            </Text>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/register">
                  <Icon icon={UserPlus} size="sm" />
                  {t('primaryCta')}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">
                  {t('secondaryCta')}
                  <Icon icon={ArrowRight} size="sm" flipRtl />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border border-border-default bg-surface p-6 text-center shadow-sm">
              <span className="flex size-14 items-center justify-center rounded-full bg-primary-subtle">
                <Icon icon={Stethoscope} size="lg" className="text-primary" />
              </span>
              <Heading level={3}>{t('patientsCard.title')}</Heading>
              <Text size="sm" tone="secondary">
                {t('patientsCard.description')}
              </Text>
              <svg
                className="pointer-events-none absolute inset-x-0 bottom-0 text-primary/10"
                viewBox="0 0 200 40"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M0 20 Q50 0 100 20 T200 20 V40 H0 Z" fill="currentColor" />
              </svg>
            </div>
            <div className="relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border border-border-default bg-surface p-6 text-center shadow-sm">
              <span className="flex size-14 items-center justify-center rounded-full bg-success-subtle">
                <Icon icon={UserPlus} size="lg" className="text-success" />
              </span>
              <Heading level={3}>{t('doctorsCard.title')}</Heading>
              <Text size="sm" tone="secondary">
                {t('doctorsCard.description')}
              </Text>
              <svg
                className="pointer-events-none absolute inset-x-0 bottom-0 text-success/10"
                viewBox="0 0 200 40"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M0 20 Q50 0 100 20 T200 20 V40 H0 Z" fill="currentColor" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
