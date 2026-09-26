import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { StatusBadge, statusTone, type StatusKey } from './status-badge';

describe('StatusBadge', () => {
  it('renders the given label', () => {
    renderWithProviders(<StatusBadge status="available" label="Available" />);
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('falls back to the default translated label for the status', () => {
    renderWithProviders(<StatusBadge status="no_show" />);
    expect(screen.getByText('No-show')).toBeInTheDocument();
  });

  it('gives the same status the same tone everywhere', () => {
    const expected: Record<string, string> = {
      requested: 'warning',
      confirmed: 'info',
      live: 'live',
      completed: 'success',
      paid: 'success',
      cancelled: 'danger',
      no_show: 'danger',
      expired: 'neutral',
      refunded: 'neutral',
    };
    for (const [status, tone] of Object.entries(expected)) {
      expect(statusTone(status as StatusKey)).toBe(tone);
    }
  });

  it('renders "Awaiting outcome" for a confirmed appointment whose slot has passed (time-aware)', () => {
    renderWithProviders(<StatusBadge status="confirmed" timeAware={{ scheduledAt: '2020-01-01T10:00:00.000Z' }} />);
    expect(screen.getByText('Awaiting outcome')).toBeInTheDocument();
  });

  it('keeps "Confirmed" for a future slot', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    renderWithProviders(<StatusBadge status="confirmed" label="Confirmed" timeAware={{ scheduledAt: future }} />);
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('shows a live dot for a live status', () => {
    const { container } = renderWithProviders(<StatusBadge status="in_consultation" />);
    expect(container.querySelector('[data-status="in_consultation"] > span')).not.toBeNull();
  });
});
