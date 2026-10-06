import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { useVerificationAnalytics } from '@/features/reporting/hooks/use-verification-analytics';
import enMessages from '../../../../messages/en.json';

import { VerificationAnalyticsPanel } from './verification-analytics-panel';

vi.mock('@/features/reporting/hooks/use-verification-analytics', () => ({
  useVerificationAnalytics: vi.fn(),
}));

const BASE_DATA = {
  pending: 2,
  approved: 10,
  rejected: 1,
  suspended: 0,
  doctorCases: 8,
  patientCases: 5,
};

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
      <VerificationAnalyticsPanel filter={{}} refetchIntervalMs={false} />
    </NextIntlClientProvider>,
  );
}

describe('VerificationAnalyticsPanel', () => {
  it('shows a danger alert when the query errors', () => {
    vi.mocked(useVerificationAnalytics).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never);

    renderPanel();

    expect(screen.getByText('Could not load verification analytics.')).toBeInTheDocument();
  });

  // Regression: production crashed with "averageReviewTimeHours.toFixed is
  // not a function" because Postgres AVG() over the raw SQL review-time
  // expression doesn't reliably come back as a plain JS number over the
  // wire -- this reproduces that exact shape (a numeric string, not a
  // number) to prove the panel formats it instead of throwing.
  it('formats the average review time even when the API sends it as a numeric string, not a number', () => {
    vi.mocked(useVerificationAnalytics).mockReturnValue({
      data: { ...BASE_DATA, averageReviewTimeHours: '6.283' as unknown as number },
      isLoading: false,
      isError: false,
    } as never);

    renderPanel();

    expect(screen.getByText('6.3 hrs')).toBeInTheDocument();
  });

  it('shows "Not available" when there is no decided case to average', () => {
    vi.mocked(useVerificationAnalytics).mockReturnValue({
      data: { ...BASE_DATA, averageReviewTimeHours: null },
      isLoading: false,
      isError: false,
    } as never);

    renderPanel();

    expect(screen.getByText('Not available')).toBeInTheDocument();
  });
});
