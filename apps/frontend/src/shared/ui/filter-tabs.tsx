import { cn } from '@/shared/lib/cn';

export interface FilterTabsOption<T extends string> {
  value: T;
  label: string;
}

export interface FilterTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: FilterTabsOption<T>[];
  className?: string;
  /** Names the group for assistive tech ("Filter by status"). */
  ariaLabel?: string;
}

/**
 * A status filter -- "All / X / Y / Z" -- rendered as a row of filter chips, never as a second tab
 * row: tabs switch which panel is shown, a filter narrows the list that is already there, and a
 * tab row nested under another tab row read as navigation. Controlled: the page owns the value.
 * Single choice, exposed as toggle buttons (`aria-pressed`) inside a labelled group.
 */
export function FilterTabs<T extends string>({ value, onChange, options, className, ariaLabel }: FilterTabsProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('flex flex-wrap items-center gap-2', className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-8 rounded-full border px-3.5 text-small font-medium whitespace-nowrap transition-colors duration-(--duration-fast)',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring pointer-coarse:min-h-11',
              selected
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'border-border-default bg-surface text-text-secondary hover:bg-surface-2 hover:text-text-primary',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
