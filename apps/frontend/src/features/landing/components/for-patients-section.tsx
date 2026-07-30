import { ArrowRight, Check, Search, Stethoscope } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { Heading, Text } from '@/design-system/typography';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Container } from '@/shared/ui/container';

const BULLET_KEYS = ['findVerifiedDoctors', 'bookInMinutes', 'consultFromHome', 'secureRecords', 'digitalPrescriptions'] as const;

export function ForPatientsSection() {
  const t = useTranslations('landing.forPatients');

  return (
    <Container size="lg" className="py-16">
      <Card className="rounded-3xl border-border-default p-8 shadow-[0_10px_30px_rgba(15,23,42,0.06)] lg:p-12 bg-[#FEFEFE]">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-subtle">
              <Icon icon={Stethoscope} size="lg" className="text-primary" />
            </span>
            <Heading level={2}>{t('title')}</Heading>
            <Text tone="secondary">{t('description')}</Text>
            <ul className="flex flex-col divide-y divide-border-default">
              {BULLET_KEYS.map((key) => (
                <li key={key} className="flex items-center gap-3 py-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary">
                    <Icon icon={Check} size="xs" className="text-primary-foreground" />
                  </span>
                  <Text size="sm">{t(`bullets.${key}`)}</Text>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-2 w-fit gap-2 rounded-xl">
              <Link href="/patient/doctors">
                <Icon icon={Search} size="sm" />
                {t('cta')}
                <Icon icon={ArrowRight} size="sm" flipRtl />
              </Link>
            </Button>
          </div>

          <div className="relative flex items-center justify-center">
            <div
              className="absolute start-8 top-4 -z-10 size-72 rounded-full bg-primary/10 blur-3xl"
              aria-hidden="true"
            />
            <Image
              src="/for-patients.png"
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
