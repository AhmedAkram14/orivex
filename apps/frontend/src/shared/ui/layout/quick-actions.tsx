import type { LucideIcon } from 'lucide-react';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

export interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

/** A grid of large tap-friendly shortcuts (e.g. "Security Center") — every entry a real `Link` to a real route, never a disabled placeholder button, so this component can only ever list destinations that actually exist. */
export function QuickActions({ actions, className }: QuickActionsProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', className)}>
      {actions.map((action) => (
        <Link
          key={action.id}
          href={action.href}
          className={cn(
            'flex items-center gap-3 rounded-lg border border-border-default bg-surface p-4 text-start transition-colors',
            'hover:bg-secondary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
          )}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary">
            <Icon icon={action.icon} size="md" />
          </div>
          <span className="text-sm font-medium text-text-primary">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
