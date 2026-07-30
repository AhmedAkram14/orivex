'use client';

import {
  ArrowRight,
  Baby,
  Bone,
  Brain,
  Ear,
  Eye,
  HeartPulse,
  ShieldCheck,
  ScanLine,
  Smile,
  Stethoscope,
  Syringe,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePublicSpecialties } from '@/features/landing/hooks/use-public-specialties';
import type { PublicSpecialty } from '@/features/landing/api/types';
import { Heading, Text } from '@/design-system/typography';
import { Badge, type BadgeProps } from '@/shared/ui/badge';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Card } from '@/shared/ui/card';
import { Container } from '@/shared/ui/container';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';

// "info" is deliberately excluded here -- this design system's own tokens
// define --color-info as the exact same hex as --color-primary (both
// #2563eb), so a card accented "info" is visually indistinguishable from
// one accented "primary", not just similar. These 4 are the only genuinely
// distinct hues the existing token set has to offer.
type AccentKey = 'primary' | 'success' | 'warning' | 'danger';

const ACCENTS: Record<AccentKey, { badge: BadgeProps['variant']; icon: string; iconBg: string; border: string }> = {
  primary: { badge: 'primary', icon: 'text-primary', iconBg: 'bg-primary-subtle', border: 'border-t-primary' },
  success: { badge: 'success', icon: 'text-success', iconBg: 'bg-success-subtle', border: 'border-t-success' },
  warning: { badge: 'warning', icon: 'text-warning', iconBg: 'bg-warning-subtle', border: 'border-t-warning' },
  danger: { badge: 'danger', icon: 'text-danger', iconBg: 'bg-danger-subtle', border: 'border-t-danger' },
};
const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[];

// Matched by keyword against the real specialty name -- purely cosmetic
// (which icon/color/tagline a card gets), never a source of truth about
// what the specialty is. Each category keeps the SAME icon+color+tagline
// every time (keyed off the category itself, not the card's position in
// the grid), so a specialty's look stays stable even if the real doctor
// counts driving the sort order change. Adjacent categories are assigned
// different accents from each other so no two neighbors render
// identically; with only 4 distinct hues and more than 4 categories, a
// repeat is unavoidable somewhere, but never between neighbors. Anything
// unmatched falls back to a generic stethoscope + a hash-stable color
// (still consistent per specialty, just not hand-picked) and a generic
// tagline.
const CATEGORIES: { pattern: RegExp; key: string; icon: LucideIcon; accent: AccentKey }[] = [
  { pattern: /orthop|bone|spine/i, key: 'orthopedics', icon: Bone, accent: 'primary' },
  { pattern: /anesthes/i, key: 'anesthesiology', icon: Syringe, accent: 'success' },
  { pattern: /dent|oral/i, key: 'dentistry', icon: Smile, accent: 'warning' },
  { pattern: /pediatric/i, key: 'pediatrics', icon: Baby, accent: 'danger' },
  { pattern: /radiol|imaging/i, key: 'radiology', icon: ScanLine, accent: 'success' },
  { pattern: /cardio|heart/i, key: 'cardiology', icon: HeartPulse, accent: 'danger' },
  { pattern: /neuro|brain/i, key: 'neurology', icon: Brain, accent: 'warning' },
  { pattern: /ophthalmol|\beye/i, key: 'ophthalmology', icon: Eye, accent: 'primary' },
  { pattern: /\bent\b|ear|nose|throat/i, key: 'ent', icon: Ear, accent: 'success' },
];

function hashIndex(value: string, length: number): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % length;
}

function styleFor(specialty: PublicSpecialty) {
  const matched = CATEGORIES.find((category) => category.pattern.test(specialty.name));
  if (matched) return matched;
  return { key: 'generic', icon: Stethoscope, accent: ACCENT_KEYS[hashIndex(specialty.name, ACCENT_KEYS.length)] };
}

function SpecialtyCard({ specialty }: { specialty: PublicSpecialty }) {
  const t = useTranslations('landing.specialties');
  const style = styleFor(specialty);
  const accent = ACCENTS[style.accent];

  return (
    <Link href={`/patient/doctors?specialtyId=${specialty.id}`} className="block h-full">
      <Card
        className={cn(
          'flex h-full flex-col items-center gap-3 border-t-4 p-6 text-center transition-shadow hover:shadow-md',
          accent.border,
        )}
      >
        <div className={cn('flex size-14 items-center justify-center rounded-full', accent.iconBg)}>
          <Icon icon={style.icon} size="lg" className={accent.icon} />
        </div>
        <Heading level={4}>{specialty.name}</Heading>
        <Text size="sm" tone="secondary">
          {t(`categories.${style.key}`)}
        </Text>
        <Badge variant={accent.badge} className="gap-1.5">
          <Icon icon={Users} size="xs" />
          {t('doctorCount', { count: specialty.doctorCount })}
        </Badge>
        <span className="h-px w-full bg-border-default" aria-hidden="true" />
        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          {t('viewDoctors')}
          <Icon icon={ArrowRight} size="sm" flipRtl />
        </span>
      </Card>
    </Link>
  );
}

/**
 * Real specialties only, each with its real doctor count (from
 * `GET /public/specialties` -- never hardcoded). A specialty with zero
 * doctors today is simply not shown, rather than displayed as a dead-end
 * choice. The stats bar (specialty count, total verified doctors) is
 * likewise derived from that same real response -- no fabricated
 * "patient satisfaction" style metric the platform has no data for.
 */
export function SpecialtiesSection() {
  const t = useTranslations('landing.specialties');
  const { data: specialties, isLoading } = usePublicSpecialties();
  const visible = specialties?.filter((specialty) => specialty.doctorCount > 0) ?? [];
  const totalDoctors = visible.reduce((sum, specialty) => sum + specialty.doctorCount, 0);

  return (
    <Container id="specialties" size="lg" className="flex flex-col items-center gap-8 py-16 scroll-mt-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <Badge variant="primary" className="gap-1.5 px-3 py-1 text-xs uppercase tracking-wide">
          <Icon icon={ShieldCheck} size="xs" />
          {t('verifiedBadge')}
        </Badge>
        <Heading level={1}>{t('title')}</Heading>
        <Text tone="secondary" className="max-w-xl">
          {t('description')}
        </Text>
      </div>

      {!isLoading && visible.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-border-default bg-surface px-8 py-4 shadow-sm sm:gap-10">
          <div className="flex items-center gap-2">
            <Icon icon={Stethoscope} size="md" className="text-primary" />
            <span className="text-lg font-bold text-text-primary">{visible.length}+</span>
            <Text size="sm" tone="secondary">
              {t('specialtiesStat')}
            </Text>
          </div>
          <span className="hidden h-8 w-px bg-border-default sm:block" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <Icon icon={Users} size="md" className="text-success" />
            <span className="text-lg font-bold text-text-primary">{totalDoctors}+</span>
            <Text size="sm" tone="secondary">
              {t('doctorsStat')}
            </Text>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-56 w-full" />
          ))}
        </div>
      )}

      {!isLoading && visible.length === 0 && <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />}

      {!isLoading && visible.length > 0 && (
        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((specialty) => (
            <SpecialtyCard key={specialty.id} specialty={specialty} />
          ))}
        </div>
      )}
    </Container>
  );
}
