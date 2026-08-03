// Compare Periods support: given a [dateFrom, dateTo] window, returns the
// immediately-preceding window of the same duration (e.g. "this week" ->
// "last week" is just this helper with a 7-day-wide filter). Falls back to
// the trailing 30 days when no explicit range was given, so "compare" always
// has a well-defined baseline even on an unfiltered dashboard.
export interface DateWindow {
  from: Date;
  to: Date;
}

const DEFAULT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function resolveCurrentWindow(dateFrom?: Date, dateTo?: Date): DateWindow {
  const to = dateTo ?? new Date();
  const from = dateFrom ?? new Date(to.getTime() - DEFAULT_WINDOW_MS);
  return { from, to };
}

export function resolvePreviousWindow(current: DateWindow): DateWindow {
  const durationMs = current.to.getTime() - current.from.getTime();
  return {
    from: new Date(current.from.getTime() - durationMs),
    to: new Date(current.from.getTime()),
  };
}
