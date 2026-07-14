import type { HTMLAttributes, ReactNode } from 'react';
import { Heading } from '@/design-system/typography';
import { cn } from '@/shared/lib/cn';

export interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** A page-level title region — title, optional description, optional trailing actions (e.g. a primary action button, typically a `PageActions` group). Distinct from Topbar (app-wide) and Section (a labeled sub-region within a page). */
export function PageHeader({ title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)} {...props}>
      <div className="flex flex-col gap-1">
        <Heading level={1}>{title}</Heading>
        {description && <p className="text-sm text-text-secondary">{description}</p>}
      </div>
      {actions && <PageActions>{actions}</PageActions>}
    </div>
  );
}

/** A row of page-level actions (e.g. a primary + secondary button pair) — usable inside `PageHeader`'s `actions` slot or standalone wherever a page needs an action row outside the title region. */
export function PageActions({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2', className)} {...props} />;
}
