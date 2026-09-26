import { ArrowRight, CalendarCheck, Search, ShieldCheck, Stethoscope } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Heading, Text } from '@/design-system/typography';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { Container } from '@/shared/ui/container';
import { Illustration } from '@/shared/ui/illustrations/illustration';

const BULLET_KEYS = ['findVerifiedDoctors', 'bookInMinutes', 'consultFromHome', 'secureRecords', 'digitalPrescriptions'] as const;
const PANEL_ROWS = [
  { key: 'findVerifiedDoctors', icon: Stethoscope },
  { key: 'bookInMinutes', icon: CalendarCheck },
  { key: 'secureRecords', icon: ShieldCheck },
] as const;

/**
 * Left-aligned editorial split (copy on the start side, a warm panel on the
 * end side). The panel is live, translated HTML -- it replaces a flattened
 * screenshot that carried a typo ("Appoinment") and an invented doctor with a
 * made-up 5.0 rating.
 */
export function ForPatientsSection() {
  const t = useTranslations('landing.forPatients');
  const tUi = useTranslations('landingUi');

  return (
    <Container size="lg" className="py-20">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <Heading as="h2" level={2}>{t('title')}</Heading>
          <Text tone="secondary" className="max-w-prose">{t('description')}</Text>
          <ul className="flex flex-col divide-y divide-border-default border-y border-border-default">
            {BULLET_KEYS.map((key) => (
              <li key={key} className="py-3">
                <Text size="sm">{t(`bullets.${key}`)}</Text>
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-1 w-fit gap-2">
            <Link href="/patient/doctors">
              <Icon icon={Search} size="sm" />
              {t('cta')}
              <Icon icon={ArrowRight} size="sm" flipRtl />
            </Link>
          </Button>
        </div>

        <div className="flex flex-col items-center gap-5 rounded-(--r-hero) bg-warm-1 p-8">
          <Illustration name="booking-confirmed" className="size-44" />
          <p className="text-h3 text-text-primary">{tUi('patientPanelTitle')}</p>
          <ul className="flex w-full flex-col gap-2">
            {PANEL_ROWS.map(({ key, icon }) => (
              <li key={key} className="flex items-center gap-3 rounded-md bg-surface/80 px-4 py-3">
                <Icon icon={icon} size="md" className="shrink-0 text-text-secondary" />
                <Text size="sm">{t(`bullets.${key}`)}</Text>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Container>
  );
}
