import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Heading, Text } from '@/design-system/typography';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { Container } from '@/shared/ui/container';

const BULLET_KEYS = ['flexibleSchedule', 'videoConsultations', 'digitalPrescriptions', 'securePayments', 'growPractice'] as const;

export function ForDoctorsSection() {
  const t = useTranslations('landing.forDoctors');

  return (
    <Container size="lg" className="bg-surface-raised py-16">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Heading level={1}>{t('title')}</Heading>
        <Text tone="secondary">{t('description')}</Text>
        <ul className="flex flex-col gap-3">
          {BULLET_KEYS.map((key) => (
            <li key={key} className="flex items-start gap-2">
              <Icon icon={Check} size="sm" className="mt-0.5 shrink-0 text-success" />
              <Text size="sm">{t(`bullets.${key}`)}</Text>
            </li>
          ))}
        </ul>
        <Button asChild size="lg" className="self-start">
          <Link href="/register">{t('cta')}</Link>
        </Button>
      </div>
    </Container>
  );
}
