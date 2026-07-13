import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

/** Placeholder for content of a known shape while it loads (Phase 1's loading-pattern decision: skeleton for known shape, Spinner for unknown-duration actions). Respects reduced-motion via the shared `--duration-*` tokens, which collapse to 0ms under `prefers-reduced-motion`. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-secondary-subtle', className)}
      role="presentation"
      aria-hidden="true"
      {...props}
    />
  );
}
