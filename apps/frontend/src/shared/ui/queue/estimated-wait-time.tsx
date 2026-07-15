import { Clock } from 'lucide-react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface EstimatedWaitTimeProps {
  /** Pre-formatted, localized wait-time text (e.g. "~15 min") — this component never computes or formats a duration itself. */
  label: string;
  className?: string;
}

/** A small inline estimate — used inside a `PatientQueueCard`, but standalone enough for any future "estimated wait" surface (e.g. a patient-facing queue status page) to reuse without depending on the queue card itself. */
export function EstimatedWaitTime({ label, className }: EstimatedWaitTimeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-text-tertiary', className)}>
      <Icon icon={Clock} size="xs" />
      {label}
    </span>
  );
}
