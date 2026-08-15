import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export const alertVariants = cva('flex gap-3 rounded-md border p-4 text-sm', {
  variants: {
    variant: {
      info: 'border-info-subtle bg-info-subtle text-info-emphasis',
      success: 'border-success-subtle bg-success-subtle text-success-emphasis',
      warning: 'border-warning-subtle bg-warning-subtle text-warning-emphasis',
      danger: 'border-danger-subtle bg-danger-subtle text-danger-emphasis',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

const iconByVariant = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const;

export interface AlertProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
}

/** A banner-level status message. Distinct from Toast (transient, corner-anchored) — Alert is inline, part of the page layout, and stays until dismissed or its cause resolves. */
export function Alert({ className, variant = 'info', title, children, ...props }: AlertProps) {
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon icon={iconByVariant[variant ?? 'info']} className="mt-0.5 shrink-0" />
      <div className="flex flex-col gap-1">
        {title && <p className="font-medium">{title}</p>}
        <div className="text-text-secondary">{children}</div>
      </div>
    </div>
  );
}
