import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export function Footer({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <footer
      className={cn('border-t border-border-default bg-surface px-4 py-6 text-sm text-text-tertiary', className)}
      {...props}
    />
  );
}
