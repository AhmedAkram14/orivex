import { CalendarCheck, CalendarClock, FileText, Video, Wallet, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Heading, Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import type { Audience } from '@/features/landing/components/audience-showcase';

const BENEFITS: Record<Audience, { key: string; icon: LucideIcon }[]> = {
  patient: [
    { key: 'book', icon: CalendarCheck },
    { key: 'visit', icon: Video },
    { key: 'records', icon: FileText },
  ],
  doctor: [
    { key: 'hours', icon: CalendarClock },
    { key: 'video', icon: Video },
    { key: 'earnings', icon: Wallet },
  ],
};

export interface AudienceCopyProps {
  audience: Audience;
  /** `ink`: on the doctors' ink band (light text, lime icons). */
  tone?: 'default' | 'ink';
  /** The section's one call to action, decided by who is viewing. */
  cta?: ReactNode;
  className?: string;
}

/**
 * The copy half of an audience section, the same for both audiences: eyebrow, h2, one supporting sentence, exactly
 * three benefits (an icon, a bold lead, one short clause) and the CTA. The steps themselves live in How It Works.
 */
export function AudienceCopy({ audience, tone = 'default', cta, className }: AudienceCopyProps) {
  const t = useTranslations(audience === 'patient' ? 'landing.forPatients' : 'landing.forDoctors');
  const ink = tone === 'ink';

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {/* Uppercase and tracking only in Latin script: letter-spacing would break Arabic's joined letters. */}
      <p className={cn('text-caption font-semibold ltr:uppercase ltr:tracking-wider', ink ? 'text-on-ink-band/70' : 'text-text-tertiary')}>
        {t('eyebrow')}
      </p>
      <Heading as="h2" level={2} className={cn('text-balance', ink && 'text-on-ink-band')}>
        {t('title')}
      </Heading>
      <Text className={cn('max-w-[52ch]', ink ? 'text-on-ink-band/75' : 'text-text-secondary')}>{t('description')}</Text>
      <ul className="flex flex-col gap-4">
        {BENEFITS[audience].map(({ key, icon }) => (
          <li key={key} className="flex items-start gap-3">
            <Icon icon={icon} size="md" className={cn('mt-0.5 shrink-0', ink ? 'text-pulse' : 'text-text-primary')} />
            <p className={cn('text-body', ink ? 'text-on-ink-band/85' : 'text-text-secondary')}>
              <strong className={cn('font-semibold', ink ? 'text-on-ink-band' : 'text-text-primary')}>{t(`benefits.${key}.lead`)}</strong>
              {' — '}
              {t(`benefits.${key}.text`)}
            </p>
          </li>
        ))}
      </ul>
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  );
}
