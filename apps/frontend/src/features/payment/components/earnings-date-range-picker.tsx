'use client';

import { DateRangePicker, type DateRangePickerProps } from '@/shared/ui/date-range-picker';

export { getLast30DaysRange } from '@/shared/ui/date-range-picker';

export type EarningsDateRangePickerProps = Omit<DateRangePickerProps, 'idPrefix'>;

/** The Earnings page's range toolbar -- the shared `DateRangePicker`, same as Reports (presets, then a custom-range popover). */
export function EarningsDateRangePicker(props: EarningsDateRangePickerProps) {
  return <DateRangePicker idPrefix="earnings-date" {...props} />;
}
