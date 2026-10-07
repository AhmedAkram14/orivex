import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Frames one of the homepage's app-preview vignettes on a content page.
 * Same contract as the homepage stage: illustrative only, so it is hidden
 * from assistive tech and `inert` (nothing inside can be focused or clicked).
 * The surrounding copy carries the meaning.
 */
export function PreviewFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div aria-hidden="true" className={cn('rounded-(--r-card) shadow-md', className)}>
      <div inert>{children}</div>
    </div>
  );
}
