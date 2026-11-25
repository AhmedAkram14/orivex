import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { JoinCountdown } from './join-countdown';

import { useJoinCountdown } from '@/shared/hooks/use-join-countdown';

vi.mock('@/shared/hooks/use-join-countdown', () => ({ useJoinCountdown: vi.fn() }));

const mockedUseJoinCountdown = vi.mocked(useJoinCountdown);

function renderCountdown(locale: string, msUntilOpen: number, label = 'Joins in') {
  mockedUseJoinCountdown.mockReturnValue({ canJoin: false, msUntilOpen });

  return render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <JoinCountdown scheduledAt="2026-01-01T10:00:00.000Z" label={label} />
    </NextIntlClientProvider>,
  );
}

describe('JoinCountdown', () => {
  it('formats waits longer than 24 hours as localized days, hours, and minutes', () => {
    renderCountdown('en', 3 * 24 * 60 * 60_000 + 4 * 60 * 60_000 + 20 * 60_000);

    expect(screen.getByText('Joins in 3 days, 4 hours, and 20 minutes')).toBeInTheDocument();
  });

  it('localizes long countdown units for Arabic', () => {
    renderCountdown('ar', 3 * 24 * 60 * 60_000 + 4 * 60 * 60_000 + 20 * 60_000, 'ينضم بعد');

    expect(screen.getByText(/ينضم بعد .*أيام.*ساعات.*دقيقة/)).toBeInTheDocument();
  });

  it('keeps the existing clock format at and below 24 hours', () => {
    const view = renderCountdown('en', 24 * 60 * 60_000);

    expect(screen.getByText('Joins in 24:00:00')).toBeInTheDocument();

    mockedUseJoinCountdown.mockReturnValue({ canJoin: false, msUntilOpen: 23 * 60 * 60_000 + 59 * 60_000 + 59_000 });
    view.rerender(
      <NextIntlClientProvider locale="en" messages={{}}>
        <JoinCountdown scheduledAt="2026-01-01T10:00:00.000Z" label="Joins in" />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText('Joins in 23:59:59')).toBeInTheDocument();
  });
});
