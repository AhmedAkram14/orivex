'use client';

import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import type { PricingType } from '@/features/scheduling/types';
import { cn } from '@/shared/lib/cn';

export interface PricingTypeRadioGroupProps {
  value: PricingType;
  onChange: (value: PricingType) => void;
  freeLabel: string;
  paidLabel: string;
  /** Accessible name for the group itself (e.g. "Monday pricing"). */
  groupLabel: string;
  /** Unique per rendered instance (e.g. a per-day/per-window key) so `id`/`aria-labelledby` pairs never collide when several of these render on one page. */
  idPrefix: string;
  className?: string;
}

/**
 * The one shared Free/Paid pricing-type control for the Schedule page's two
 * pricing surfaces (Weekly Availability's per-day default pricing in
 * `working-hours-form.tsx`, and Upcoming Slots' per-window override in
 * `slot-pricing-dialog.tsx`) -- replaces a `FilterTabs` (Radix Tabs
 * underneath: `role="tablist"`/`"tab"`, meant for switching which content
 * panel is visible, not for a two-choice *value*) with a real
 * `role="radiogroup"`/`"radio"` pair via the existing
 * `shared/ui/radio-group.tsx` primitive.
 *
 * Mirrors `doctor-settings-form.tsx`'s own established workaround for the
 * same underlying issue: Radix's `RadioGroupItem` renders a
 * `<button role="radio">`, which isn't a labelable element, so wrapping it
 * in a `<label>` alone names nothing. Fixed the same way here: an
 * `aria-label` on the group itself, `aria-labelledby` on each item pointing
 * at its own visible text span. The label span (not a div wrapping the
 * radio button itself) is a real click target -- wrapping the
 * `RadioGroupItem` in its own click handler produced a genuine double-toggle
 * bug under React Testing Library (the click bubbling into the wrapper
 * raced Radix's own pointerdown-time selection and could flip the value
 * back), confirmed and fixed during this component's own tests.
 */
export function PricingTypeRadioGroup({
  value,
  onChange,
  freeLabel,
  paidLabel,
  groupLabel,
  idPrefix,
  className,
}: PricingTypeRadioGroupProps) {
  const options: { value: PricingType; label: string }[] = [
    { value: 'free', label: freeLabel },
    { value: 'paid', label: paidLabel },
  ];

  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as PricingType)}
      className={cn('flex items-center gap-4', className)}
      aria-label={groupLabel}
    >
      {options.map((option) => {
        const labelId = `${idPrefix}-${option.value}-label`;
        return (
          <div key={option.value} className="flex items-center gap-2 text-sm text-text-primary">
            <RadioGroupItem value={option.value} id={`${idPrefix}-${option.value}`} aria-labelledby={labelId} />
            <span id={labelId} className="cursor-pointer" onClick={() => onChange(option.value)}>
              {option.label}
            </span>
          </div>
        );
      })}
    </RadioGroup>
  );
}
