import type { ReactNode } from 'react';
import type { PrescriptionStatus } from '@/features/patient/api/types';
import { StatusBadge } from '@/shared/ui/status-badge';

export interface PrescriptionStatusBadgeProps {
  status: PrescriptionStatus;
  label: ReactNode;
}

/** The real 2-value `PrescriptionStatus` ('active' | 'expired') through the shared status map -- never a 3rd "completed" state the domain doesn't have. */
export function PrescriptionStatusBadge({ status, label }: PrescriptionStatusBadgeProps) {
  return <StatusBadge status={status} label={typeof label === 'string' ? label : undefined} />;
}
