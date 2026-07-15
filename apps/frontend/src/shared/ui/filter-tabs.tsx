import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';

export interface FilterTabsOption<T extends string> {
  value: T;
  label: string;
}

export interface FilterTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: FilterTabsOption<T>[];
  className?: string;
}

/**
 * A generic status-filter control — a thin `Tabs` composition, so filtering
 * is a controlled value the page owns, not state hidden inside this
 * component. Extracted from `QueueFilters` (which had no queue-specific
 * logic of its own beyond its narrower type) so any list needing the same
 * "All / X / Y / Z" filter shape — the Patient Portal's Appointment filters
 * included — reuses this instead of duplicating the Tabs-wrapping markup.
 */
export function FilterTabs<T extends string>({ value, onChange, options, className }: FilterTabsProps<T>) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as T)} className={className}>
      <TabsList>
        {options.map((option) => (
          <TabsTrigger key={option.value} value={option.value}>
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
