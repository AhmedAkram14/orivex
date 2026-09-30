import * as TabsPrimitive from '@radix-ui/react-tabs';
import { forwardRef } from 'react';
import { useDirection } from '@/shared/i18n/use-direction';
import { cn } from '@/shared/lib/cn';

/** The Radix root, reading direction defaulted to the active locale's (Radix otherwise assumes LTR). */
export const Tabs = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ dir, ...props }, ref) => {
  const direction = useDirection();
  return <TabsPrimitive.Root ref={ref} dir={dir ?? direction} {...props} />;
});
Tabs.displayName = 'Tabs';

export const TabsList = forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('inline-flex items-center gap-1 rounded-md bg-secondary-subtle p-1', className)}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'min-h-9 rounded-sm px-3 py-1.5 text-small font-medium text-text-secondary transition-[background-color,color,box-shadow] duration-(--duration-base) ease-standard',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
      'data-[state=active]:bg-surface data-[state=active]:text-text-primary data-[state=active]:shadow-sm',
      'disabled:pointer-events-none disabled:opacity-(--opacity-disabled)',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring', className)}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';
