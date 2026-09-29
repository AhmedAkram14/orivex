import { FileCheck, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Heading, Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { Container } from '@/shared/ui/container';

// Every item names a real, working mechanism in this codebase -- doctor
// verification (TrustModule), role-based access control, and the
// upload-intent/confirm MediaAsset pipeline used for both clinical
// documents and verification documents. Nothing here is aspirational.
const ITEMS = [
  { key: 'verifiedDoctors', icon: UserCheck },
  { key: 'identityVerification', icon: FileCheck },
  { key: 'roleBasedAccess', icon: ShieldCheck },
  { key: 'secureUploads', icon: Lock },
] as const;

// Real mechanisms only -- restates the four cards above in short form, same
// honesty rule as the rest of this page. Deliberately excludes "HIPAA
// Compliant" (a US regulation this Egypt-based platform has no
// certification for), "End-to-End Encryption" (a stronger, specific claim
// than the standard TLS-in-transit/at-rest-in-S3 this platform actually
// has), and "Regular Security Audits" (no audit cadence is documented
// anywhere) -- none of those three are backed by anything in this codebase.
const BANNER_ITEM_KEYS = ['roleBasedAccess', 'verifiedIdentities', 'secureCloudStorage'] as const;

/**
 * A second composition off the page's usual centred grid: a start-aligned header beside a quiet,
 * borderless list of four real mechanisms, separated by hairlines, then one summary line.
 */
export function SecurityTrustSection() {
  const t = useTranslations('landing.securityTrust');

  return (
    <Container size="lg" className="flex flex-col gap-10 py-16">
      <div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-2">
        <Heading as="h2" level={2} className="text-balance">
          {t('title')}
        </Heading>
        <Text tone="secondary" className="max-w-xl">
          {t('description')}
        </Text>
      </div>

      {/* 1px gaps over a border-coloured backing draw the hairlines between items at every column count. */}
      <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-(--r-card) border border-border-default bg-border-default sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ key, icon }) => (
          <li
            key={key}
            className="flex flex-col gap-2 bg-canvas p-6"
          >
            <Icon icon={icon} size="md" className="text-care-text" />
            <Heading level={3}>{t(`items.${key}.title`)}</Heading>
            <Text size="sm" tone="secondary">
              {t(`items.${key}.description`)}
            </Text>
            <span className="mt-auto pt-1 text-small font-medium text-text-primary">
              {t(`items.${key}.tagline`)}
            </span>
          </li>
        ))}
      </ul>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-text-secondary">
        <Icon icon={ShieldCheck} size="sm" className="text-success-emphasis" />
        <span className="font-semibold text-text-primary">{t('banner.title')}</span>
        <span>{BANNER_ITEM_KEYS.map((key) => t(`banner.items.${key}`)).join('  •  ')}</span>
      </p>
    </Container>
  );
}
