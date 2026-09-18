// Doctor Reports page rebuild (Phase 1): a small, locally-duplicated pure
// window-resolution helper -- deliberately NOT imported from
// ReportingModule's own `resolvePreviousWindow`
// (reporting/application/dto/previous-period.ts). ConsultationModule does
// not import anything from ReportingModule today, and this is a ~10-line
// pure function; crossing that module boundary for it would be the wrong
// trade versus a short local duplicate. Given a [dateFrom, dateTo) window,
// returns the immediately-preceding window of the same duration.
export interface DateWindow {
  from: Date;
  to: Date;
}

export function resolvePreviousWindow(dateFrom: Date, dateTo: Date): DateWindow {
  const durationMs = dateTo.getTime() - dateFrom.getTime();
  return {
    from: new Date(dateFrom.getTime() - durationMs),
    to: new Date(dateFrom.getTime()),
  };
}
