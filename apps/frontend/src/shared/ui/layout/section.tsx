import type { HTMLAttributes, ReactNode } from 'react';
import { Heading } from '@/design-system/typography';
import { cn } from '@/shared/lib/cn';

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  actions?: ReactNode;
}

/** A labeled sub-region within a page (e.g. one card-grid of a dashboard) — smaller in scope than Header, which titles the whole page. */
export function Section({ title, description, actions, className, children, ...props }: SectionProps) {
  return (
    <section className={cn('flex flex-col gap-4', className)} {...props}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            {title && <Heading level={3}>{title}</Heading>}
            {description && <p className="text-sm text-text-secondary">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
