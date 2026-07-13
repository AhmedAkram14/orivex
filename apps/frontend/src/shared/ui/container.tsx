import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** Caps line length for readability; 'full' opts out for shell-level layouts (e.g. the app shell in Phase 6). */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClass: Record<NonNullable<ContainerProps['size']>, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-none',
};

/** Centers content and applies responsive horizontal padding. Uses logical padding (`px-*`, which Tailwind already emits as `padding-inline`) so it is RTL-correct with no extra work. */
export function Container({ size = 'xl', className, children, ...props }: ContainerProps) {
  return (
    <div
      className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', sizeClass[size], className)}
      {...props}
    >
      {children}
    </div>
  );
}
