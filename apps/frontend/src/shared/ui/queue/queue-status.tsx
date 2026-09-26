import { StatusBadge } from '@/shared/ui/status-badge';

export type QueueStatusValue = 'waiting' | 'in-consultation' | 'completed';

export interface QueueStatusProps {
  status: QueueStatusValue;
  label: string;
}

/** A queue entry's status badge -- the shared StatusBadge (waiting = info, in consultation = the pulse "live" badge, completed = success), so a queue surface can never pick its own colours. */
export function QueueStatus({ status, label }: QueueStatusProps) {
  return <StatusBadge status={status} label={label} />;
}
