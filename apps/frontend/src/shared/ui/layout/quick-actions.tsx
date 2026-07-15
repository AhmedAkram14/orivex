import type { LucideIcon } from 'lucide-react';
import { QuickActionCard } from '@/shared/ui/layout/quick-action-card';
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

/** A grid of `QuickActionCard`s (e.g. "Security Center") — every entry a real `Link` to a real route, never a disabled placeholder button, so this component can only ever list destinations that actually exist. */
export function QuickActions({ actions, className }: QuickActionsProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', className)}>
      {actions.map((action) => (
        <QuickActionCard key={action.id} label={action.label} icon={action.icon} href={action.href} />
      ))}
    </div>
  );
}
