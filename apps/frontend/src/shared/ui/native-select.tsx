import { ChevronDown } from 'lucide-react';
import { forwardRef, type SelectHTMLAttributes } from 'react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export type NativeSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
};

/**
 * A native `<select>` drawn like `Input` (same height, border, focus ring and error state). For short fixed lists
 * inside forms -- the system picker is the best control on a phone, and nothing opens over the page.
 */
export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, wrapperClassName, value, children, ...props }, ref) => (
    <div className={cn('relative min-w-0', wrapperClassName)}>
      <select
        ref={ref}
        value={value}
        className={cn(
          'h-10 w-full appearance-none rounded-md border border-border-default bg-surface ps-3 pe-8 text-sm text-text-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-(--opacity-disabled)',
          'aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger',
          (value === '' || value === undefined) && 'text-text-tertiary',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <Icon
        icon={ChevronDown}
        size="sm"
        className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
      />
    </div>
  ),
);
NativeSelect.displayName = 'NativeSelect';
