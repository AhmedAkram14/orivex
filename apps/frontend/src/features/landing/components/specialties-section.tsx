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

// Matched by keyword against the real specialty name -- purely cosmetic
// (which icon a card gets), never a source of truth about what the
// specialty is. Anything unmatched falls back to a generic stethoscope.
const ICON_BY_KEYWORD: [RegExp, LucideIcon][] = [
  [/orthop|bone|spine/i, Bone],
  [/anesthes/i, Syringe],
  [/dent|oral/i, Smile],
  [/pediatric/i, Baby],
  [/radiol|imaging/i, ScanLine],
  [/cardio|heart/i, HeartPulse],
  [/neuro|brain/i, Brain],
  [/ophthalmol|eye/i, Eye],
  [/ent\b|ear|nose|throat/i, Ear],
];

function iconFor(name: string): LucideIcon {
  return ICON_BY_KEYWORD.find(([pattern]) => pattern.test(name))?.[1] ?? Stethoscope;
}

// Cosmetic accent cycle -- existing Badge/semantic-token variants only, no
// new colors. Purely a rotation for visual variety across cards, not tied
// to any real property of the specialty.
const ACCENTS: { badge: BadgeProps['variant']; icon: string; iconBg: string; border: string }[] = [
  { badge: 'primary', icon: 'text-primary', iconBg: 'bg-primary-subtle', border: 'border-t-primary' },
  { badge: 'success', icon: 'text-success', iconBg: 'bg-success-subtle', border: 'border-t-success' },
  { badge: 'info', icon: 'text-info', iconBg: 'bg-info-subtle', border: 'border-t-info' },
  { badge: 'danger', icon: 'text-danger', iconBg: 'bg-danger-subtle', border: 'border-t-danger' },
  { badge: 'warning', icon: 'text-warning', iconBg: 'bg-warning-subtle', border: 'border-t-warning' },
];

function SpecialtyCard({ specialty, index }: { specialty: PublicSpecialty; index: number }) {
  const t = useTranslations('landing.specialties');
  const accent = ACCENTS[index % ACCENTS.length];
  const SpecialtyIcon = iconFor(specialty.name);

  return (
    <Link href={`/patient/doctors?specialtyId=${specialty.id}`} className="block h-full">
      <Card
        className={cn(
          'flex h-full flex-col items-center gap-3 border-t-4 p-6 text-center transition-shadow hover:shadow-md',
          accent.border,
        )}
      >
        <div className={cn('flex size-14 items-center justify-center rounded-full', accent.iconBg)}>
          <Icon icon={SpecialtyIcon} size="lg" className={accent.icon} />
        </div>
        <Heading level={4}>{specialty.name}</Heading>
        <Badge variant={accent.badge} className="gap-1.5">
          <Icon icon={Users} size="xs" />
          {t('doctorCount', { count: specialty.doctorCount })}
        </Badge>
        <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary">
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
      <Badge variant="primary" className="gap-1.5 px-3 py-1 text-xs uppercase tracking-wide">
        <Icon icon={ShieldCheck} size="xs" />
        {t('verifiedBadge')}
      </Badge>

      <div className="flex flex-col items-center gap-2 text-center">
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
          {visible.map((specialty, index) => (
            <SpecialtyCard key={specialty.id} specialty={specialty} index={index} />
          ))}
        </div>
      )}
    </Container>
  );
}
