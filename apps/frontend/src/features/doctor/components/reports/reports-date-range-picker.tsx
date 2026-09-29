'use client';

import { DateRangePicker, type DateRangePickerProps } from '@/shared/ui/date-range-picker';

export { getLast30DaysRange } from '@/shared/ui/date-range-picker';

export type ReportsDateRangePickerProps = Omit<DateRangePickerProps, 'idPrefix'>;

/** The Reports page's range toolbar -- the shared `DateRangePicker`, same as Earnings (presets, then a custom-range popover). */
export function ReportsDateRangePicker(props: ReportsDateRangePickerProps) {
  return <DateRangePicker idPrefix="reports-date" {...props} />;
}
