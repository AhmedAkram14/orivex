import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { forwardRef } from 'react';
import { useDirection } from '@/shared/i18n/use-direction';
import { cn } from '@/shared/lib/cn';

/** The Radix root, reading direction defaulted to the active locale's (Radix otherwise assumes LTR). */
export const RadioGroup = forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ dir, ...props }, ref) => {
  const direction = useDirection();
  return <RadioGroupPrimitive.Root ref={ref} dir={dir ?? direction} {...props} />;
});
RadioGroup.displayName = 'RadioGroup';

export const RadioGroupItem = forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      // size-6 (24px) meets WCAG 2.2 AA's 24x24px minimum target size --
      // this was previously size-5 (20px), under the minimum.
      'size-6 shrink-0 rounded-full border border-border-strong bg-surface',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
      'data-[state=checked]:border-primary',
      'disabled:pointer-events-none disabled:opacity-(--opacity-disabled)',
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex h-full w-full items-center justify-center">
      <span className="size-2.5 rounded-full bg-primary" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = 'RadioGroupItem';
