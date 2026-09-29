import {
  CalendarCheck,
  Check,
  CreditCard,
  FileText,
  ShieldCheck,
  Stethoscope,
  Video,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Heading, Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
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
  { key: 'doctorDirectory', icon: Stethoscope, tint: 'info' },
  { key: 'onlineBooking', icon: CalendarCheck, tint: 'warm' },
  { key: 'videoConsultations', icon: Video, tint: 'success' },
  { key: 'digitalPrescriptions', icon: FileText, tint: 'info' },
  { key: 'securePayments', icon: CreditCard, tint: 'warm' },
  { key: 'identityVerification', icon: ShieldCheck, tint: 'success' },
] as const;

/** Tinted icon discs from the semantic palette (care blue, warm peach, success green) -- never the muddy neutral. */
const TINT: Record<(typeof FEATURES)[number]['tint'], string> = {
  info: 'bg-info-subtle text-info-emphasis',
  warm: 'bg-warm-1 text-text-primary',
  success: 'bg-success-subtle text-success-emphasis',
};

/**
 * A split composition, not the centred "eyebrow + title + grid" used elsewhere on the page: the
 * start-aligned header stays in view beside the cards on wide screens.
 */
export function CoreFeaturesSection() {
  const t = useTranslations('landing.coreFeatures');

  return (
    <Container size="lg" className="py-16">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
          <p className="text-caption font-semibold tracking-wide text-text-tertiary uppercase">
            {t('eyebrow')}
          </p>
          <Heading as="h2" level={2} className="text-balance">
            {t('title')}
          </Heading>
          <Text tone="secondary" className="max-w-md">
            {t('description')}
          </Text>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map(({ key, icon, tint }) => (
            <Card key={key} className="flex flex-col gap-3 bg-surface p-6 shadow-sm">
              <span
                className={`flex size-12 items-center justify-center rounded-full ${TINT[tint]}`}
              >
                <Icon icon={icon} size="md" />
              </span>
              <Heading level={3}>{t(`items.${key}.title`)}</Heading>
              <Text size="sm" tone="secondary" className="grow">
                {t(`items.${key}.description`)}
              </Text>
              <span className="flex items-center gap-2 border-t border-border-default pt-3 text-small text-text-secondary">
                <Icon icon={Check} size="xs" className="shrink-0 text-success-emphasis" />
                {t(`items.${key}.tagline`)}
              </span>
            </Card>
          ))}
        </div>
      </div>
    </Container>
  );
}
