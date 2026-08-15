import { ArrowRight, FileCheck, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Heading, Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { Badge, type BadgeProps } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { Container } from '@/shared/ui/container';

// Every item names a real, working mechanism in this codebase -- doctor
// verification (TrustModule), role-based access control, and the
// upload-intent/confirm MediaAsset pipeline used for both clinical
// documents and verification documents. Nothing here is aspirational.
const ITEMS = [
  { key: 'verifiedDoctors', icon: UserCheck, accent: 'primary' },
  { key: 'identityVerification', icon: FileCheck, accent: 'success' },
  { key: 'roleBasedAccess', icon: ShieldCheck, accent: 'warning' },
  { key: 'secureUploads', icon: Lock, accent: 'primary' },
] as const satisfies readonly { key: string; icon: typeof UserCheck; accent: BadgeProps['variant'] }[];

const ACCENT_CLASSES: Record<NonNullable<BadgeProps['variant']>, { iconBg: string; icon: string; underline: string }> = {
  primary: { iconBg: 'bg-primary-subtle', icon: 'text-primary', underline: 'bg-primary' },
  success: { iconBg: 'bg-success-subtle', icon: 'text-success', underline: 'bg-success' },
  warning: { iconBg: 'bg-warning-subtle', icon: 'text-warning', underline: 'bg-warning' },
  danger: { iconBg: 'bg-danger-subtle', icon: 'text-danger', underline: 'bg-danger' },
  neutral: { iconBg: 'bg-neutral-subtle', icon: 'text-neutral', underline: 'bg-neutral' },
  info: { iconBg: 'bg-info-subtle', icon: 'text-info', underline: 'bg-info' },
};

// Real mechanisms only -- restates the four cards above in short form, same
// honesty rule as the rest of this page. Deliberately excludes "HIPAA
// Compliant" (a US regulation this Egypt-based platform has no
// certification for), "End-to-End Encryption" (a stronger, specific claim
// than the standard TLS-in-transit/at-rest-in-S3 this platform actually
// has), and "Regular Security Audits" (no audit cadence is documented
// anywhere) -- none of those three are backed by anything in this codebase.
const BANNER_ITEM_KEYS = ['roleBasedAccess', 'verifiedIdentities', 'secureCloudStorage'] as const;

export function SecurityTrustSection() {
  const t = useTranslations('landing.securityTrust');

  return (
    <Container size="lg" className="flex flex-col gap-8 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <Badge variant="primary" className="gap-1.5 px-3 py-1 text-xs uppercase tracking-wide">
          <Icon icon={ShieldCheck} size="xs" />
          {t('eyebrow')}
        </Badge>
        <Heading level={1}>{t('title')}</Heading>
        <Text tone="secondary" className="max-w-xl">
          {t('description')}
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ key, icon, accent }) => {
          const palette = ACCENT_CLASSES[accent];
          return (
            <Card
              key={key}
              className="relative flex flex-col items-center gap-3 rounded-2xl border-border-default p-6 text-center shadow-md transition-all duration-(--duration-base) ease-standard hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                className="pointer-events-none absolute end-6 top-6 size-16 opacity-40"
                style={{ backgroundImage: 'radial-gradient(var(--color-border-strong) 1px, transparent 1px)', backgroundSize: '10px 10px' }}
                aria-hidden="true"
              />

              <div className={`relative flex size-20 items-center justify-center rounded-full ${palette.iconBg}`}>
                <Icon icon={icon} size="lg" className={palette.icon} />
                <span className={`absolute -bottom-1 -end-1 flex size-6 items-center justify-center rounded-full ${palette.underline} ring-2 ring-surface`}>
                  <Icon icon={ShieldCheck} size="xs" className="text-primary-foreground" />
                </span>
              </div>

              <Heading level={3}>{t(`items.${key}.title`)}</Heading>
              <span className={`h-1 w-10 rounded-full ${palette.underline}`} aria-hidden="true" />
              <Text size="sm" tone="secondary">
                {t(`items.${key}.description`)}
              </Text>

              <div className={`mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium ${palette.iconBg} ${palette.icon}`}>
                <Icon icon={ShieldCheck} size="xs" />
                {t(`items.${key}.tagline`)}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-primary-subtle px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface">
            <Icon icon={ShieldCheck} size="md" className="text-primary" />
          </span>
          <div className="flex flex-col">
            <Text className="font-bold">{t('banner.title')}</Text>
            <Text size="sm" tone="secondary">
              {BANNER_ITEM_KEYS.map((key) => t(`banner.items.${key}`)).join('  •  ')}
            </Text>
          </div>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface shadow-sm">
          <Icon icon={ArrowRight} size="sm" className="text-primary" flipRtl />
        </span>
      </div>
    </Container>
  );
}
