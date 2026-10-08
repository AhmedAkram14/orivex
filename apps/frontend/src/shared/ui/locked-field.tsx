import { Lock } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { Input } from '@/shared/ui/input';

export interface LockedFieldProps {
  label: string;
  value: string;
  /** Why it can't be edited here / where it comes from. */
  help?: ReactNode;
  /** Keep a value such as a license number left-to-right inside RTL text. */
  ltr?: boolean;
  className?: string;
}

/**
 * A value the user can see but not change here (the account name, a license number after registration): the same
 * height and border as an input, on `surface-2`, with a lock at the inline end and a line saying why.
 */
export function LockedField({ label, value, help, ltr, className }: LockedFieldProps) {
  const id = useId();
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-text-primary">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          readOnly
          dir={ltr ? 'ltr' : undefined}
          value={value}
          aria-describedby={help ? `${id}-help` : undefined}
          className={cn(
            'cursor-default bg-surface-2 pe-9 text-text-secondary',
            ltr && 'rtl:text-right',
          )}
        />
        <Icon
          icon={Lock}
          size="sm"
          className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
      </div>
      {help && (
        <p id={`${id}-help`} className="text-small text-text-tertiary">
          {help}
        </p>
      )}
    </div>
  );
}
