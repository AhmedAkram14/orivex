import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

/** The full-width app-level bar (logo, global search trigger, user menu) — distinct from Header, which is a page-level title region inside Content. Phase 6 (Application Shell) composes this with real navigation/user-menu content; this layer only provides the structural region. */
export function Topbar({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <header
      className={cn(
        'flex h-14 shrink-0 items-center gap-4 border-b border-border-default bg-surface px-4',
        className,
      )}
      {...props}
    />
  );
}
