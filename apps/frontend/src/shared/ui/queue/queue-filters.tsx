import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import type { QueueStatusValue } from '@/shared/ui/queue/queue-status';

export type QueueFilterValue = 'all' | QueueStatusValue;

export interface QueueFilterOption {
  value: QueueFilterValue;
  label: string;
}

export interface QueueFiltersProps {
  value: QueueFilterValue;
  onChange: (value: QueueFilterValue) => void;
  options: QueueFilterOption[];
  className?: string;
}

/** Filters `WaitingQueue` by status (All / Waiting / In Consultation / Completed) — a thin `Tabs` composition, so filtering is a controlled value the page owns, not state hidden inside this component. */
export function QueueFilters({ value, onChange, options, className }: QueueFiltersProps) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as QueueFilterValue)} className={className}>
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
