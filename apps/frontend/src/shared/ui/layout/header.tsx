import type { HTMLAttributes, ReactNode } from 'react';
import { Heading } from '@/design-system/typography';
import { cn } from '@/shared/lib/cn';

export interface HeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** A page-level title region — title, optional description, optional trailing actions (e.g. a primary action button). Distinct from Topbar (app-wide) and Section (a labeled sub-region within a page). */
export function Header({ title, description, actions, className, ...props }: HeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)} {...props}>
      <div className="flex flex-col gap-1">
        <Heading level={1}>{title}</Heading>
        {description && <p className="text-sm text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
