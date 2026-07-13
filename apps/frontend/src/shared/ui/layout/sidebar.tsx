import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

/** The structural side-navigation region. Renders whatever nav content it's given — role-aware nav items (Doctor/Patient/Admin) are Phase 5/6 scope, not this layer's. Uses a logical `border-e` so it reads as a trailing-edge border in both LTR and RTL without a direction-specific override. */
export function Sidebar({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <aside
      className={cn(
        'flex h-full w-64 shrink-0 flex-col gap-1 border-e border-border-default bg-surface p-3',
        className,
      )}
      {...props}
    />
  );
}

export function SidebarSection({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1', className)} {...props} />;
}

export function SidebarSectionLabel({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('px-2 py-1.5 text-xs font-medium text-text-tertiary', className)} {...props} />
  );
}
