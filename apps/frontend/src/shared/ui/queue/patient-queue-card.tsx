import type { ReactNode } from 'react';
import { EstimatedWaitTime } from '@/shared/ui/queue/estimated-wait-time';
import { QueueStatus, type QueueStatusValue } from '@/shared/ui/queue/queue-status';
import { cn } from '@/shared/lib/cn';

export interface PatientQueueCardProps {
  /** The queue entry's 1-based position (e.g. 1 for "next up"). */
  position: number;
  /** A caller-supplied label identifying the entry (e.g. a patient's display name, or an anonymized "Patient #3" placeholder before real Patient-module data exists) — this component never invents one. */
  label: string;
  status: QueueStatusValue;
  statusLabel: string;
  waitTimeLabel?: string;
  actions?: ReactNode;
  className?: string;
}

/** A single waiting-queue entry — position, identifying label, status badge, optional estimated-wait text, optional actions. The building block `WaitingQueue` renders a list of; also usable standalone (e.g. `CurrentPatientCard` composes it without a wait-time). */
export function PatientQueueCard({
  position,
  label,
  status,
  statusLabel,
  waitTimeLabel,
  actions,
  className,
}: PatientQueueCardProps) {
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border border-border-default bg-surface p-3', className)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary-subtle text-sm font-medium text-text-secondary">
        {position}
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-text-primary">{label}</p>
          <QueueStatus status={status} label={statusLabel} />
        </div>
        {waitTimeLabel && <EstimatedWaitTime label={waitTimeLabel} />}
      </div>
      {actions}
    </div>
  );
}
