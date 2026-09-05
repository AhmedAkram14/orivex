import { ChevronDown, Stethoscope, UserRound, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Badge } from '@/shared/ui/badge';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

/** Descriptions past this length collapse behind "View details" by default — short notes never gain a redundant toggle. */
const EXPAND_THRESHOLD = 140;

// Matches the real `MedicalRecordEntryType` exactly -- no "diagnosis"/
// "allergy" concept distinct from "condition" exists in the domain
// (HealthGraphNodeType has no such members), never fabricated here.
export type RecordTimelineEntryType = 'visit' | 'condition';

const iconByType: Record<RecordTimelineEntryType, LucideIcon> = {
  visit: Stethoscope,
  condition: UserRound,
};

const badgeVariantByType: Record<RecordTimelineEntryType, 'info' | 'warning' | 'danger' | 'neutral'> = {
  visit: 'info',
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
  /** Localized "View details" / "Show less" toggle labels — required only when `description` is long enough to collapse. */
  viewDetailsLabel?: string;
  showLessLabel?: string;
  className?: string;
}

/**
 * A single chronological medical-record entry (visit/condition) — the
 * Patient Portal's Medical Records timeline architecture.
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
  viewDetailsLabel,
  showLessLabel,
  className,
}: RecordTimelineEntryProps) {
  const isCollapsible = Boolean(description && description.length > EXPAND_THRESHOLD && viewDetailsLabel);
  const [expanded, setExpanded] = useState(!isCollapsible);

  return (
    <div className={cn('flex gap-4', className)}>
      <div className="flex flex-col items-center">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary-emphasis">
          <Icon icon={iconByType[type]} size="sm" />
        </span>
        {!isLast && <span className="mt-1 w-px flex-1 bg-border-default" aria-hidden="true" />}
      </div>
      <div className="flex-1 pb-5">
        <div className="flex flex-col gap-1.5 rounded-lg border border-border-default bg-surface p-4 shadow-sm transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:border-border-strong">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-text-primary">{title}</p>
            <Badge variant={badgeVariantByType[type]}>{typeLabel}</Badge>
          </div>
          <p className="text-xs text-text-tertiary">
            {dateLabel}
            {doctorName && <span> · {doctorName}</span>}
          </p>
          {description && (
            <p className={cn('text-sm text-text-secondary', !expanded && 'line-clamp-2')}>{description}</p>
          )}
          {isCollapsible && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              className="inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {expanded ? showLessLabel : viewDetailsLabel}
              <Icon icon={ChevronDown} size="xs" className={cn('transition-transform', expanded && 'rotate-180')} />
            </button>
          )}
          {actions && <div className="pt-1">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
