import { cn } from '@/shared/lib/cn';

export interface LegendItem {
  id: string;
  label: string;
  /** A Tailwind background color utility class (e.g. "bg-success") — the same token any other status indicator in this codebase already uses, never a raw hex value. */
  colorClassName: string;
}

export interface LegendProps {
  items: LegendItem[];
  className?: string;
}

/** A color-key row explaining what a calendar's status colors mean (available/booked/blocked, etc.) — pairs a color dot with a real, localized label so the key never relies on color alone. */
export function Legend({ items, className }: LegendProps) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-4', className)}>
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span className={cn('size-2.5 rounded-full', item.colorClassName)} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
