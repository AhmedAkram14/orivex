import { FilterTabs } from '@/shared/ui/filter-tabs';
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

/** Filters `WaitingQueue` by status (All / Waiting / In Consultation / Completed) — a `QueueStatusValue`-typed wrapper over the generic `FilterTabs`, which owns the actual Tabs-composition markup. */
export function QueueFilters(props: QueueFiltersProps) {
  return <FilterTabs {...props} />;
}
