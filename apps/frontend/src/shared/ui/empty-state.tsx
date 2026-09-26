import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { Illustration, type IllustrationKey } from '@/shared/ui/illustrations/illustration';

export interface EmptyStateProps {
  /** A scene from the illustration set. Prefer this; `icon` is the legacy fallback for call sites not yet migrated. */
  illustration?: IllustrationKey;
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  /** `sm` inline (72px art), `md` card (default), `lg` page. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE = {
  sm: 'gap-2 py-4',
  md: 'gap-3 py-10',
  lg: 'gap-4 py-20',
} as const;

/** For "no data yet" -- always a picture, an `h3`-scale title, one sentence and (ideally) a next step. Distinct from Alert (a status message) and ErrorState (a failure). */
export function EmptyState({ illustration, icon, title, description, action, secondaryAction, size = 'md', className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center text-center', SIZE[size], className)}>
      {illustration ? (
        <Illustration name={illustration} size={size === 'sm' ? 72 : 120} />
      ) : (
        icon && (
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-text-tertiary">
            <Icon icon={icon} size="lg" />
          </div>
        )
      )}
      <div className="flex max-w-prose flex-col gap-1">
        <p className={cn('text-text-primary', size === 'sm' ? 'text-small font-semibold' : 'text-h3')}>{title}</p>
        {description && <p className={cn('text-text-secondary', size === 'sm' ? 'text-small' : 'text-body')}>{description}</p>}
      </div>
      {(action || secondaryAction) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
