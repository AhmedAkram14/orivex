import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** For "no data yet" — distinct from Alert (a status message) and from an error page (a failure). Illustration-system art (Phase 1's illustration-system requirement) can replace the icon slot once that asset set exists; this component doesn't hardcode which. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 py-12 text-center', className)}>
      {icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-secondary-subtle text-text-tertiary">
          <Icon icon={icon} size="lg" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        {description && <p className="text-sm text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}
