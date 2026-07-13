import * as SwitchPrimitive from '@radix-ui/react-switch';
import { forwardRef } from 'react';
import { cn } from '@/shared/lib/cn';

export const Switch = forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-neutral-subtle transition-colors duration-(--duration-fast)',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
      'data-[state=checked]:bg-primary',
      'disabled:pointer-events-none disabled:opacity-(--opacity-disabled)',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'block size-5 translate-x-0.5 rounded-full bg-surface shadow-sm transition-transform duration-(--duration-fast)',
        'rtl:data-[state=checked]:-translate-x-[1.375rem] data-[state=checked]:translate-x-[1.375rem]',
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = 'Switch';
