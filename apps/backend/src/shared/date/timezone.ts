const OPERATING_TIME_ZONE = 'Africa/Cairo';

/**
 * ORIVEX Egypt V1 has one operating timezone (mirrors the frontend's own
 * `shared/lib/date/timezone.ts`). A doctor's stored working-hours "HH:mm"
 * values are Africa/Cairo wall-clock times, not UTC and not the server
 * process's local timezone -- this converts a calendar date + wall-clock
 * time into the real UTC instant it represents, accounting for Cairo's DST
 * rules (Egypt reintroduced DST in 2023) rather than a fixed offset.
 */
export function zonedTimeToUtc(year: number, month: number, day: number, hours: number, minutes: number): Date {
  const asIfUtc = Date.UTC(year, month, day, hours, minutes, 0, 0);
  const offsetMinutes = getTimeZoneOffsetMinutes(new Date(asIfUtc));
  return new Date(asIfUtc - offsetMinutes * 60_000);
}

function getTimeZoneOffsetMinutes(date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: OPERATING_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const asIfCairoWasUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asIfCairoWasUtc - date.getTime()) / 60_000;
}
