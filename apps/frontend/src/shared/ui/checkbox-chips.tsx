'use client';

import { Check } from 'lucide-react';
import type { FocusEvent, Ref } from 'react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface CheckboxChipOption {
  value: string;
  label: string;
}

export interface CheckboxChipsProps {
  options: readonly CheckboxChipOption[];
  value: readonly string[];
  /** Keeps the order things were chosen in (a newly ticked value is appended). */
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  labelledBy?: string;
  invalid?: boolean;
  describedBy?: string;
  firstRef?: Ref<HTMLInputElement>;
  className?: string;
}

/**
 * A multi-select as pill-shaped chips -- each a real checkbox (so it reads and works as a checkbox group, with
 * Space to toggle), drawn with a check mark once ticked so it never looks like a single-choice radio.
 */
export function CheckboxChips({
  options,
  value,
  onChange,
  onBlur,
  labelledBy,
  invalid,
  describedBy,
  firstRef,
  className,
}: CheckboxChipsProps) {
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (onBlur && !event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur();
  }

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onBlur={handleBlur}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {options.map((option, index) => {
        const checked = value.includes(option.value);
        return (
          <label
            key={option.value}
            className={cn(
              'inline-flex h-9 cursor-pointer select-none items-center gap-1.5 rounded-full border px-3.5 text-small font-medium transition-colors duration-(--duration-fast) pointer-coarse:min-h-11',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus-ring has-[:focus-visible]:ring-offset-2',
              checked
                ? 'border-text-primary bg-text-primary text-text-inverse'
                : 'border-border-default bg-surface text-text-secondary hover:border-text-primary/30',
              invalid && !checked && 'border-danger',
            )}
          >
            <input
              ref={index === 0 ? firstRef : undefined}
              type="checkbox"
              className="sr-only"
              checked={checked}
              aria-invalid={invalid || undefined}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...value, option.value]
                    : value.filter((entry) => entry !== option.value),
                )
              }
            />
            <span
              aria-hidden="true"
              className={cn(
                'flex size-4 items-center justify-center rounded-sm border',
                checked ? 'border-text-inverse' : 'border-border-strong',
              )}
            >
              {checked && <Icon icon={Check} size="xs" className="stroke-3" />}
            </span>
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
