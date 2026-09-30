import type { ReactNode } from 'react';
import { PersonAvatar } from '@/shared/ui/avatar';
import { DateBlock } from '@/shared/ui/date-block';
import { SpecialtyChip } from '@/shared/ui/specialty-chip';
import { StatusBadge } from '@/shared/ui/status-badge';
import { cn } from '@/shared/lib/cn';

// Matches ConsultationModule's real AppointmentStatus enum exactly.
export type AppointmentCardStatus =
  | 'requested'
  | 'confirmed'
  | 'rescheduled'
  | 'cancelled'
  | 'no_show'
  | 'completed'
  | 'expired'
  // Derived, not a backend enum value: a confirmed appointment whose slot has passed (see isAwaitingOutcome).
  | 'awaiting_outcome';

export interface AppointmentCardProps {
  /** ISO timestamp -- drives the DateBlock. */
  scheduledAt: string;
  /** Pre-formatted, localized time text (e.g. "10:00 AM") shown beside the name. */
  timeLabel: string;
  /** The other party's name -- a doctor's name from the patient's viewpoint. */
  counterpartyName: string;
  counterpartyAvatarUrl?: string;
  /** Localized specialty label; with `specialtyName` (canonical English) it renders as a hue-coded chip. */
  counterpartyDetail?: string;
  specialtyName?: string;
  status: AppointmentCardStatus;
  statusLabel: string;
  /** Pre-formatted, localized consultation-type text (e.g. "Free consultation"). */
  consultationTypeLabel: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * A single appointment row: the DateBlock as its one leading anchor, the
 * counterparty's name with a 24px avatar inline before it, a specialty chip,
 * a StatusBadge and the consultation type, with the row's actions on the
 * inline-end. Every appointment row in both roles follows this pattern. Placed under `shared/ui/appointments/`
 * (mirroring `shared/ui/queue/` and `shared/ui/schedule/`) -- nothing here
 * assumes the viewer's role.
 */
export function AppointmentCard({
  scheduledAt,
  timeLabel,
  counterpartyName,
  counterpartyAvatarUrl,
  counterpartyDetail,
  specialtyName,
  status,
  statusLabel,
  consultationTypeLabel,
  actions,
  className,
}: AppointmentCardProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-4 rounded-(--r-card) border border-border-default bg-surface p-4 shadow-xs',
        className,
      )}
    >
      {/* The DateBlock is the row's one leading anchor; the person rides inline with their name (xs). */}
      <DateBlock date={scheduledAt} />
      <div className="flex min-w-0 flex-1 basis-52 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex min-w-0 items-center gap-2 text-body font-medium text-text-primary">
            <PersonAvatar name={counterpartyName} src={counterpartyAvatarUrl} size="xs" />
            <bdi className="min-w-0">{counterpartyName}</bdi>
          </p>
          <StatusBadge status={status} label={statusLabel} />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-text-tertiary">
          <span dir="auto" className="tabular-nums">{timeLabel}</span>
          {counterpartyDetail && (
            <SpecialtyChip name={specialtyName ?? counterpartyDetail} label={counterpartyDetail} />
          )}
          <span>{consultationTypeLabel}</span>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
