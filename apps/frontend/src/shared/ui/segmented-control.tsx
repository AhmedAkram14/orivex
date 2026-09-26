'use client';

import { cn } from '@/shared/lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  /** The selected value, or `undefined` when none of the options matches (e.g. a custom date range). */
  value: T | undefined;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

/** A pill-shaped single-choice control (presets, time ranges, view modes). Buttons expose `aria-pressed`; the selected one is the ink fill. */
export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel, className }: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('flex w-fit max-w-full flex-wrap gap-1 rounded-full border border-border-default bg-surface p-1', className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-8 rounded-full px-3.5 text-small font-medium transition-colors duration-(--duration-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring pointer-coarse:min-h-11',
            option.value === value ? 'bg-primary text-primary-foreground' : 'text-text-secondary hover:bg-surface-2',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
