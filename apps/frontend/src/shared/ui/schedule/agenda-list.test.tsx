import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { AgendaList } from './agenda-list';

describe('AgendaList', () => {
  it('renders each item with its date, time, title, and status', () => {
    renderWithProviders(
      <AgendaList
        items={[
          {
            id: '1',
            dateLabel: 'Mon, Jul 20',
            timeLabel: '9:00 AM',
            title: 'Available slot',
            status: 'available',
            statusLabel: 'Available',
          },
        ]}
        emptyTitle="Nothing scheduled"
      />,
    );

    expect(screen.getByText('Mon, Jul 20')).toBeInTheDocument();
    expect(screen.getByText('9:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Available slot')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('shows an empty state when there are no items', () => {
    renderWithProviders(
      <AgendaList items={[]} emptyTitle="Nothing scheduled" emptyDescription="Your upcoming slots will appear here." />,
    );

    expect(screen.getByText('Nothing scheduled')).toBeInTheDocument();
    expect(screen.getByText('Your upcoming slots will appear here.')).toBeInTheDocument();
  });
});
