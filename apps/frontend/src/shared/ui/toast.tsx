import * as ToastPrimitive from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle2, Info, X, XCircle, type LucideIcon } from 'lucide-react';
import { forwardRef } from 'react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export const ToastProvider = ToastPrimitive.Provider;

/** Top-end corner: top-right in LTR, top-left in RTL (logical `end-0`). */
export const ToastViewport = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      'fixed end-0 top-0 z-(--z-toast) flex w-full max-w-sm flex-col gap-2 p-4 outline-none',
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = 'ToastViewport';

const toastVariants = cva(
  'pointer-events-auto relative flex animate-slide-in-end items-start gap-3 overflow-hidden rounded-(--r-card) border bg-surface-raised p-4 shadow-md',
  {
    variants: {
      variant: {
        default: 'border-border-default',
        success: 'border-success/40',
        warning: 'border-warning/40',
        danger: 'border-danger/40',
        info: 'border-info/40',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export type ToastVariant = NonNullable<VariantProps<typeof toastVariants>['variant']>;

export const TOAST_ICON: Record<ToastVariant, { icon: LucideIcon; className: string; bar: string }> = {
  default: { icon: Info, className: 'text-text-tertiary', bar: 'bg-text-tertiary' },
  success: { icon: CheckCircle2, className: 'text-success', bar: 'bg-success' },
  warning: { icon: AlertTriangle, className: 'text-warning', bar: 'bg-warning' },
  danger: { icon: XCircle, className: 'text-danger', bar: 'bg-danger' },
  info: { icon: Info, className: 'text-info', bar: 'bg-info' },
};

export interface ToastRootProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>,
    VariantProps<typeof toastVariants> {
  /** ms -- drives the 4s progress hairline along the bottom edge. */
  durationMs?: number;
}

export const Toast = forwardRef<React.ElementRef<typeof ToastPrimitive.Root>, ToastRootProps>(
  ({ className, variant, durationMs = 4000, children, ...props }, ref) => {
    const tone = TOAST_ICON[variant ?? 'default'];
    return (
      <ToastPrimitive.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props}>
        <Icon icon={tone.icon} size="md" className={cn('mt-0.5 shrink-0', tone.className)} />
        {children}
        <span
          aria-hidden="true"
          className={cn('absolute inset-x-0 bottom-0 h-0.5 origin-(--toast-origin,left) animate-toast-progress rtl:origin-right', tone.bar)}
          style={{ ['--toast-duration' as string]: `${durationMs}ms` }}
        />
      </ToastPrimitive.Root>
    );
  },
);
Toast.displayName = 'Toast';

export const ToastTitle = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn('text-small font-semibold text-text-primary', className)} {...props} />
));
ToastTitle.displayName = 'ToastTitle';

export const ToastDescription = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description ref={ref} className={cn('text-small text-text-secondary', className)} {...props} />
));
ToastDescription.displayName = 'ToastDescription';

export const ToastClose = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn('ms-auto rounded-sm text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring', className)}
    {...props}
  >
    <Icon icon={X} size="sm" label="Dismiss" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = 'ToastClose';

export const ToastAction = ToastPrimitive.Action;
