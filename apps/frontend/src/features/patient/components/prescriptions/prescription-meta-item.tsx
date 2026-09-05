import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface PrescriptionMetaItemProps {
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}

/** A small icon + text pill for one fact about a prescription (prescribed date, prescriber) — the `PrescriptionCard`'s meta row is built from a few of these. */
export function PrescriptionMetaItem({ icon, children, className }: PrescriptionMetaItemProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-border-default bg-surface px-2 py-1 text-xs text-text-secondary',
        className,
      )}
    >
      <Icon icon={icon} size="xs" className="text-text-tertiary" />
      {children}
    </span>
  );
}
