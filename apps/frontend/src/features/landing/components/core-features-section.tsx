import { ArrowRight, CalendarCheck, Check, CreditCard, FileText, HeartPulse, ShieldCheck, Stethoscope, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Heading, Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { Container } from '@/shared/ui/container';

// Deliberately limited to capabilities confirmed real end-to-end in the
// audit backing this page. Explicitly excluded: any AI feature (bound only
// to a not-configured stub, zero frontend usage), Lab/Radiology/Pharmacy,
// Search, Reporting/Analytics, Mobile/PWA -- none of these exist. The
// footer tagline on each card restates that same real capability in a
// shorter form -- never a new claim, no stat, nothing the description
// above it doesn't already say.
const FEATURES = [
  { key: 'doctorDirectory', icon: Stethoscope, accentBadge: false },
  { key: 'onlineBooking', icon: CalendarCheck, accentBadge: false },
  { key: 'videoConsultations', icon: Video, accentBadge: false },
  { key: 'digitalPrescriptions', icon: FileText, accentBadge: false },
  { key: 'securePayments', icon: CreditCard, accentBadge: true },
  { key: 'identityVerification', icon: ShieldCheck, accentBadge: false },
] as const;

export function CoreFeaturesSection() {
  const t = useTranslations('landing.coreFeatures');

  return (
    <Container size="lg" className="flex flex-col gap-8 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <Badge variant="primary" className="gap-1.5 px-3 py-1 text-xs uppercase tracking-wide">
          <Icon icon={HeartPulse} size="xs" />
          {t('eyebrow')}
        </Badge>
        <Heading level={1}>{t('title')}</Heading>
        <Text tone="secondary" className="max-w-xl">
          {t('description')}
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ key, icon, accentBadge }) => (
          <Card
            key={key}
            className="relative flex flex-col gap-4 rounded-3xl border-border-default p-8 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-[250ms] ease-out hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)]"
          >
            <div
              className="pointer-events-none absolute end-6 top-6 size-16 opacity-40"
              style={{ backgroundImage: 'radial-gradient(var(--color-border-strong) 1px, transparent 1px)', backgroundSize: '10px 10px' }}
              aria-hidden="true"
            />

            <div className="relative flex size-20 items-center justify-center rounded-full bg-primary-subtle">
              <Icon icon={icon} size="lg" className="text-primary" />
              {accentBadge && (
                <span className="absolute -bottom-1 -end-1 flex size-6 items-center justify-center rounded-full bg-success ring-2 ring-surface">
                  <Icon icon={Check} size="xs" className="text-success-foreground" />
                </span>
              )}
            </div>

            <Heading level={3}>{t(`items.${key}.title`)}</Heading>
            <Text tone="secondary">{t(`items.${key}.description`)}</Text>

            <span className="mt-auto h-px w-full bg-border-default" aria-hidden="true" />

            <div className="flex items-center justify-between pt-1">
              <span className="flex items-center gap-2 text-sm text-text-secondary">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon icon={Check} size="xs" />
                </span>
                {t(`items.${key}.tagline`)}
              </span>
              <Icon icon={ArrowRight} size="sm" className="text-primary" flipRtl />
            </div>
          </Card>
        ))}
      </div>
    </Container>
  );
}
