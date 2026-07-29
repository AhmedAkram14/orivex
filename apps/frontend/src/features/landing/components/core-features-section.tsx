import { CalendarCheck, FileText, ShieldCheck, Stethoscope, Video, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Heading, Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { Card } from '@/shared/ui/card';
import { Container } from '@/shared/ui/container';

// Deliberately limited to capabilities confirmed real end-to-end in the
// audit backing this page. Explicitly excluded: any AI feature (bound only
// to a not-configured stub, zero frontend usage), Lab/Radiology/Pharmacy,
// Search, Reporting/Analytics, Mobile/PWA -- none of these exist.
const FEATURES = [
  { key: 'doctorDirectory', icon: Stethoscope },
  { key: 'onlineBooking', icon: CalendarCheck },
  { key: 'videoConsultations', icon: Video },
  { key: 'digitalPrescriptions', icon: FileText },
  { key: 'securePayments', icon: Wallet },
  { key: 'identityVerification', icon: ShieldCheck },
] as const;

export function CoreFeaturesSection() {
  const t = useTranslations('landing.coreFeatures');

  return (
    <Container size="lg" className="flex flex-col gap-8 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <Heading level={1}>{t('title')}</Heading>
        <Text tone="secondary" className="max-w-xl">
          {t('description')}
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ key, icon }) => (
          <Card key={key} className="flex flex-col gap-3 p-6">
            <Icon icon={icon} size="lg" className="text-primary" />
            <Heading level={4}>{t(`items.${key}.title`)}</Heading>
            <Text size="sm" tone="secondary">
              {t(`items.${key}.description`)}
            </Text>
          </Card>
        ))}
      </div>
    </Container>
  );
}
