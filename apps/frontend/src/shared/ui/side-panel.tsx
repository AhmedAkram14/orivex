import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

/**
 * Shared implementation behind both Drawer (side-anchored) and Sheet
 * (bottom-anchored) — both are the same Radix Dialog primitive with a
 * different anchor edge, so the slide-direction/positioning logic exists
 * once here rather than duplicated across two component files.
 */
const sidePanelVariants = cva(
  'fixed z-(--z-drawer) border-border-default bg-surface shadow-xl focus-visible:outline-none',
  {
    variants: {
      side: {
        start: 'inset-y-0 start-0 h-full w-full max-w-sm border-e',
        end: 'inset-y-0 end-0 h-full w-full max-w-sm border-s',
        bottom: 'inset-x-0 bottom-0 max-h-[80vh] w-full rounded-t-lg border-t',
      },
    },
    defaultVariants: {
      side: 'end',
    },
  },
);

export const SidePanelRoot = DialogPrimitive.Root;
export const SidePanelTrigger = DialogPrimitive.Trigger;
export const SidePanelClose = DialogPrimitive.Close;

interface SidePanelContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sidePanelVariants> {}

export const SidePanelContent = forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, SidePanelContentProps>(
  ({ className, side, children, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-(--z-overlay) bg-overlay" />
      <DialogPrimitive.Content ref={ref} className={cn(sidePanelVariants({ side }), 'p-6', className)} {...props}>
        {children}
        <DialogPrimitive.Close
          className={cn(
            'absolute end-4 top-4 rounded-sm text-text-tertiary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
          )}
        >
          <Icon icon={X} size="sm" label="Close" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  ),
);
SidePanelContent.displayName = 'SidePanelContent';

export const SidePanelTitle = DialogPrimitive.Title;
export const SidePanelDescription = DialogPrimitive.Description;

export function SidePanelHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 pe-6', className)} {...props} />;
}

export function SidePanelFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-6 flex items-center justify-end gap-2', className)} {...props} />;
}

/** Drawer — a side-anchored panel (`side="start" | "end"`), typically navigation or contextual detail. Default anchor follows reading direction (`end`), i.e. it flips sides automatically under `dir="rtl"` since logical `end` already means "left" in RTL. */
export const Drawer = Object.assign(SidePanelRoot, {
  Trigger: SidePanelTrigger,
  Content: SidePanelContent,
  Close: SidePanelClose,
  Title: SidePanelTitle,
  Description: SidePanelDescription,
  Header: SidePanelHeader,
  Footer: SidePanelFooter,
});

/** Sheet — a bottom-anchored panel (mobile-style, slides up), for compact contextual actions on small viewports. */
export const Sheet = Object.assign(SidePanelRoot, {
  Trigger: SidePanelTrigger,
  Content: (props: Omit<SidePanelContentProps, 'side'>) => <SidePanelContent side="bottom" {...props} />,
  Close: SidePanelClose,
  Title: SidePanelTitle,
  Description: SidePanelDescription,
  Header: SidePanelHeader,
  Footer: SidePanelFooter,
});
