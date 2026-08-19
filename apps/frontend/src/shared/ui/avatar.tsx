import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { forwardRef } from 'react';
import { cn } from '@/shared/lib/cn';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClass: Record<AvatarSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
  xl: 'size-24 text-2xl',
};

export const Avatar = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & { size?: AvatarSize }
>(({ className, size = 'md', ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn('relative flex shrink-0 overflow-hidden rounded-full', sizeClass[size], className)}
    {...props}
  />
));
Avatar.displayName = 'Avatar';

export const AvatarImage = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn('size-full object-cover', className)} {...props} />
));
AvatarImage.displayName = 'AvatarImage';

export const AvatarFallback = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn('flex size-full items-center justify-center bg-secondary-subtle font-medium text-text-secondary', className)}
    {...props}
  />
));
AvatarFallback.displayName = 'AvatarFallback';

/**
 * Optional presence dot, composed alongside Avatar rather than built into it
 * — feeds Phase 21's realtime presence data once that phase exists; this
 * component only renders whatever status prop it's given.
 */
export function AvatarPresenceDot({ status, className }: { status: 'online' | 'offline' | 'busy'; className?: string }) {
  const colorByStatus: Record<typeof status, string> = {
    online: 'bg-success',
    offline: 'bg-neutral',
    busy: 'bg-danger',
  };
  return (
    <span
      className={cn('absolute end-0 bottom-0 size-2.5 rounded-full ring-2 ring-surface', colorByStatus[status], className)}
      aria-hidden="true"
    />
  );
}
