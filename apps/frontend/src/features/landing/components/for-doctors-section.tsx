import { ArrowRight, Check, Stethoscope, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { Heading, Text } from '@/design-system/typography';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Container } from '@/shared/ui/container';

const BULLET_KEYS = [
  'flexibleSchedule',
  'videoConsultations',
  'digitalPrescriptions',
  'securePayments',
  'growPractice',
] as const;

export function ForDoctorsSection() {
  const t = useTranslations('landing.forDoctors');

  return (
    <Container id="for-doctors" size="lg" className="scroll-mt-16 py-16">
      <Card className="rounded-2xl border-border-default p-8 shadow-md lg:p-12">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 ">
          <div className="flex flex-col gap-4 lg:order-1">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-success-subtle">
              <Icon icon={Stethoscope} size="lg" className="text-success" />
            </span>
            <Heading level={2}>{t('title')}</Heading>
            <Text tone="secondary">{t('description')}</Text>
            <ul className="flex flex-col divide-y divide-border-default">
              {BULLET_KEYS.map((key) => (
                <li key={key} className="flex items-center gap-3 py-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success">
                    <Icon icon={Check} size="xs" className="text-success-foreground" />
                  </span>
                  <Text size="sm">{t(`bullets.${key}`)}</Text>
                </li>
              ))}
            </ul>
            <Button
              asChild
              size="lg"
              className="mt-2 w-fit gap-2 rounded-xl bg-success text-success-foreground hover:bg-success/90"
            >
              <Link href="/register">
                <Icon icon={UserPlus} size="sm" />
                {t('cta')}
                <Icon icon={ArrowRight} size="sm" flipRtl />
              </Link>
            </Button>
          </div>

          <div className="relative flex items-center justify-center lg:order-2">
            <div
              className="absolute end-8 top-4 -z-10 size-72 rounded-full bg-success/10 blur-3xl"
              aria-hidden="true"
            />
            <Image
              src="/for-doctors.png"
              alt={t('imageAlt')}
              width={595}
              height={504}
              className="h-auto w-full max-w-md"
            />
          </div>
        </div>
      </Card>
    </Container>
  );
}
