import { Badge } from '@/shared/ui/badge';

export type QueueStatusValue = 'waiting' | 'in-consultation' | 'completed';

export interface QueueStatusProps {
  status: QueueStatusValue;
  label: string;
}

const variantByStatus: Record<QueueStatusValue, 'info' | 'warning' | 'success'> = {
  waiting: 'info',
  'in-consultation': 'warning',
  completed: 'success',
};

/** A queue entry's status badge — a small, focused wrapper around `Badge` so every queue surface (waiting list, current patient, future kiosk display) renders the same three states identically instead of each picking its own color. */
export function QueueStatus({ status, label }: QueueStatusProps) {
  return <Badge variant={variantByStatus[status]}>{label}</Badge>;
}
