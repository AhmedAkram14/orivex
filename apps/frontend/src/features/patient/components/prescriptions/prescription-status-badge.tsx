import type { ReactNode } from 'react';
import type { PrescriptionStatus } from '@/features/patient/api/types';
import { Badge } from '@/shared/ui/badge';

const badgeVariantByStatus: Record<PrescriptionStatus, 'success' | 'danger'> = {
  active: 'success',
  expired: 'danger',
};

export interface PrescriptionStatusBadgeProps {
  status: PrescriptionStatus;
  label: ReactNode;
}

/** Maps the real 2-value `PrescriptionStatus` ('active' | 'expired') to a `Badge` variant — never a 3rd "completed" state the domain doesn't have. */
export function PrescriptionStatusBadge({ status, label }: PrescriptionStatusBadgeProps) {
  return <Badge variant={badgeVariantByStatus[status]}>{label}</Badge>;
}
