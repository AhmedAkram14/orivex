import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RecurringWeeklySchedule, WeekDay } from '@/features/scheduling/types';
import { UpcomingAvailability } from './upcoming-availability';
import enMessages from '../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/doctor',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

const DAYS: WeekDay[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];
// 9 AM - 7 PM every day but Friday.
const schedule = DAYS.map((dayOfWeek) => ({
  dayOfWeek,
  isWorkingDay: dayOfWeek !== 'friday',
  hours: { start: '09:00', end: '19:00' },
  breaks: [],
})) as unknown as RecurringWeeklySchedule;

vi.mock('@/features/scheduling/hooks/use-doctor-availability', () => ({
  useDoctorAvailability: () => ({ data: schedule, isLoading: false, isError: false }),
}));

function renderAt(instant: string) {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(instant) });
  render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
      <UpcomingAvailability />
    </NextIntlClientProvider>,
  );
  // Today's row is the first; its hours are the row's last text.
  const firstRow = screen.getAllByRole('listitem')[0]!;
  return {
    firstRow,
    hours: firstRow.querySelector('[data-availability-hours]')!.textContent ?? '',
  };
}

afterEach(() => vi.useRealTimers());

// Thursday 2026-10-01; Cairo is UTC+3. The labels are checked by kind (a range, "until ...", "Ended"), not by exact
// clock text, so the test doesn't depend on the machine's time zone.
describe('UpcomingAvailability: today never advertises hours that have passed', () => {
  it("before today's hours: the full range", () => {
    const { firstRow, hours } = renderAt('2026-10-01T05:00:00Z'); // 8 AM Cairo
    expect(firstRow).toHaveTextContent('Today');
    expect(hours).toContain('–');
    expect(hours).not.toMatch(/until|Ended/);
  });

  it('during today\'s hours: "until" the end', () => {
    const { firstRow, hours } = renderAt('2026-10-01T14:00:00Z'); // 5 PM Cairo
    expect(firstRow).toHaveTextContent('Today');
    expect(hours).toMatch(/^until /);
  });

  it('after today\'s hours: "Ended", and today is still listed', () => {
    const { firstRow, hours } = renderAt('2026-10-01T18:30:00Z'); // 9:30 PM Cairo
    expect(firstRow).toHaveTextContent('Today');
    expect(hours).toBe('Ended');
    // At most four days, and a way to the full schedule.
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByRole('link', { name: 'View schedule' })).toHaveAttribute(
      'href',
      '/en/doctor/schedule',
    );
  });
});
