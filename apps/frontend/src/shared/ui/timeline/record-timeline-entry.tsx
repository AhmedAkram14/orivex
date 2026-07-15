import { AlertTriangle, Heart, Stethoscope, UserRound, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/shared/ui/badge';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export type RecordTimelineEntryType = 'visit' | 'diagnosis' | 'allergy' | 'condition';

const iconByType: Record<RecordTimelineEntryType, LucideIcon> = {
  visit: Stethoscope,
  diagnosis: Heart,
  allergy: AlertTriangle,
  condition: UserRound,
};

const badgeVariantByType: Record<RecordTimelineEntryType, 'info' | 'warning' | 'danger' | 'neutral'> = {
  visit: 'info',
  diagnosis: 'warning',
  allergy: 'danger',
  condition: 'neutral',
};

export interface RecordTimelineEntryProps {
  /** Pre-formatted, localized date text (e.g. "Jul 12, 2026") — this component never formats a date itself. */
  dateLabel: string;
  type: RecordTimelineEntryType;
  typeLabel: ReactNode;
  title: string;
  description?: string;
  /** The clinician who authored the entry, when known. */
  doctorName?: string;
  /** e.g. a `RecordDownloadButton` — omitted entirely when no document exists for this entry, never a disabled/fake action. */
  actions?: ReactNode;
  /** The last entry in its timeline omits the connecting line below it. */
  isLast?: boolean;
  className?: string;
}

/**
 * A single chronological medical-record entry (visit/diagnosis/allergy/
 * condition) — the Patient Portal's Medical Records timeline architecture.
 * Deliberately generic enough to back Phase 10's broader Patient Journey
 * Timeline later (a read-model composition over multiple modules, per
 * docs/roadmaps/frontend-master-plan.md) without a rewrite — this
 * component only renders one entry, a caller-owned list supplies real data.
 */
export function RecordTimelineEntry({
  dateLabel,
  type,
  typeLabel,
  title,
  description,
  doctorName,
  actions,
  isLast = false,
  className,
}: RecordTimelineEntryProps) {
  return (
    <div className={cn('flex gap-4', className)}>
      <div className="flex flex-col items-center">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
          <Icon icon={iconByType[type]} size="sm" />
        </span>
        {!isLast && <span className="mt-1 w-px flex-1 bg-border-default" aria-hidden="true" />}
      </div>
      <div className="flex flex-1 flex-col gap-1 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-text-primary">{title}</p>
          <Badge variant={badgeVariantByType[type]}>{typeLabel}</Badge>
        </div>
        <p className="text-xs text-text-tertiary">
          {dateLabel}
          {doctorName && <span> · {doctorName}</span>}
        </p>
        {description && <p className="text-sm text-text-secondary">{description}</p>}
        {actions && <div className="pt-1">{actions}</div>}
      </div>
    </div>
  );
}
