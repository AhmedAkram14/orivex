import type { LucideIcon } from 'lucide-react';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface QuickActionCardProps {
  label: string;
  icon: LucideIcon;
  href: string;
  description?: string;
  className?: string;
}

/** A single large tap-friendly shortcut tile — a real `Link` to a real route, never a disabled placeholder. Extracted so `QuickActions` (a grid of these) and any standalone single-tile usage (e.g. a workspace's one headline action) share one implementation instead of two near-identical Link markups. */
export function QuickActionCard({ label, icon, href, description, className }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border-default bg-surface p-4 text-start transition-colors duration-(--duration-fast)',
        'hover:bg-secondary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
        className,
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary-emphasis">
        <Icon icon={icon} size="md" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        {description && <span className="text-xs text-text-secondary">{description}</span>}
      </div>
    </Link>
  );
}
