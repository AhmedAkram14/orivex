import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

/** The main scrollable content region beside Sidebar / below Topbar. */
export function Content({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <main className={cn('flex-1 overflow-y-auto bg-canvas', className)} {...props} />;
}
