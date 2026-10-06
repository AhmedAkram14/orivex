import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { useTelemedicineAnalytics } from '@/features/reporting/hooks/use-telemedicine-analytics';
import enMessages from '../../../../messages/en.json';

import { TelemedicineAnalyticsPanel } from './telemedicine-analytics-panel';

vi.mock('@/features/reporting/hooks/use-telemedicine-analytics', () => ({
  useTelemedicineAnalytics: vi.fn(),
}));

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
      <TelemedicineAnalyticsPanel filter={{}} refetchIntervalMs={false} />
    </NextIntlClientProvider>,
  );
}

describe('TelemedicineAnalyticsPanel', () => {
  it('shows a danger alert when the query errors', () => {
    vi.mocked(useTelemedicineAnalytics).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never);

    renderPanel();

    expect(screen.getByText('Could not load telemedicine analytics.')).toBeInTheDocument();
  });

  it('renders "Not available" when there is no completed session to average', () => {
    vi.mocked(useTelemedicineAnalytics).mockReturnValue({
      data: { totalSessions: 0, completedSessions: 0, averageDurationMinutes: null },
      isLoading: false,
      isError: false,
    } as never);

    renderPanel();

    expect(screen.getByText('Not available')).toBeInTheDocument();
  });

  // Regression: production crashed with "averageDurationMinutes.toFixed is
  // not a function" because Postgres AVG() over the raw SQL duration
  // expression doesn't reliably come back as a plain JS number over the
  // wire -- this reproduces that exact shape (a numeric string, not a
  // number) to prove the panel formats it instead of throwing.
  it('formats the average duration even when the API sends it as a numeric string, not a number', () => {
    vi.mocked(useTelemedicineAnalytics).mockReturnValue({
      data: { totalSessions: 4, completedSessions: 3, averageDurationMinutes: '22.456' as unknown as number },
      isLoading: false,
      isError: false,
    } as never);

    renderPanel();

    expect(screen.getByText('22.5 min')).toBeInTheDocument();
  });

  it('formats a real numeric average duration to one decimal place', () => {
    vi.mocked(useTelemedicineAnalytics).mockReturnValue({
      data: { totalSessions: 4, completedSessions: 3, averageDurationMinutes: 18.04 },
      isLoading: false,
      isError: false,
    } as never);

    renderPanel();

    expect(screen.getByText('18.0 min')).toBeInTheDocument();
  });
});
