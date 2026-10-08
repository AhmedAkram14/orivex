'use client';

import { useRef, type FocusEvent, type KeyboardEvent, type Ref } from 'react';
import { useDirection } from '@/shared/i18n/use-direction';
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
  /** Names the control; pass `ariaLabelledBy` instead when a visible label already exists. */
  ariaLabel?: string;
  ariaLabelledBy?: string;
  /**
   * `toggle` (default): a group of `aria-pressed` buttons, for presets and view modes.
   * `radio`: a form field -- a `radiogroup` with one tab stop, arrows moving (and choosing) in reading direction.
   */
  mode?: 'toggle' | 'radio';
  /** `radio` mode: called once focus leaves the whole group (a form's "touched"). */
  onBlur?: () => void;
  /** `radio` mode: the tab-stop option, so a form can move focus to the field. */
  focusRef?: Ref<HTMLButtonElement>;
  invalid?: boolean;
  describedBy?: string;
  /** Stretch the options to share the full width equally. */
  fullWidth?: boolean;
  className?: string;
}

/** A pill-shaped single-choice control (presets, time ranges, view modes; in `radio` mode, a short form choice). The selected option is the ink fill. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  ariaLabelledBy,
  mode = 'toggle',
  onBlur,
  focusRef,
  invalid,
  describedBy,
  fullWidth,
  className,
}: SegmentedControlProps<T>) {
  const direction = useDirection();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const isRadio = mode === 'radio';
  const selectedIndex = options.findIndex((option) => option.value === value);
  const tabStop = selectedIndex >= 0 ? selectedIndex : 0;

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!isRadio) return;
    const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    let next: number | undefined;
    if (event.key === forward || event.key === 'ArrowDown') next = (index + 1) % options.length;
    else if (event.key === backward || event.key === 'ArrowUp') next = (index + options.length - 1) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    onChange(options[next]!.value);
    buttons.current[next]?.focus();
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (onBlur && !event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur();
  }

  return (
    <div
      role={isRadio ? 'radiogroup' : 'group'}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-invalid={isRadio && invalid ? true : undefined}
      aria-describedby={describedBy}
      onBlur={isRadio ? handleBlur : undefined}
      className={cn(
        'flex max-w-full flex-wrap gap-1 rounded-full border bg-surface p-1',
        fullWidth ? 'w-full' : 'w-fit',
        invalid ? 'border-danger' : 'border-border-default',
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              buttons.current[index] = element;
              if (isRadio && index === tabStop && focusRef) {
                if (typeof focusRef === 'function') focusRef(element);
                else (focusRef as { current: HTMLButtonElement | null }).current = element;
              }
            }}
            type="button"
            role={isRadio ? 'radio' : undefined}
            aria-checked={isRadio ? selected : undefined}
            aria-pressed={isRadio ? undefined : selected}
            tabIndex={isRadio ? (index === tabStop ? 0 : -1) : undefined}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'h-8 rounded-full px-3.5 text-small font-medium transition-colors duration-(--duration-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring pointer-coarse:min-h-11',
              fullWidth && 'flex-1',
              selected ? 'bg-primary text-primary-foreground' : 'text-text-secondary hover:bg-surface-2',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
