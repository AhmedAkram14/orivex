import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { TimeGrid } from './time-grid';

describe('TimeGrid', () => {
  it('renders one TimeSlot per entry', () => {
    renderWithProviders(
      <TimeGrid
        slots={[
          { id: '1', timeLabel: '9:00 AM', status: 'available' },
          { id: '2', timeLabel: '9:30 AM', status: 'booked' },
        ]}
      />,
    );

    expect(screen.getByText('9:00 AM')).toBeInTheDocument();
    expect(screen.getByText('9:30 AM')).toBeInTheDocument();
  });

  it('calls onSelect for an available slot', async () => {
    const onSelect = vi.fn();
    renderWithProviders(<TimeGrid slots={[{ id: '1', timeLabel: '9:00 AM', status: 'available', onSelect }]} />);

    await userEvent.click(screen.getByRole('button', { name: /9:00 AM/ }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('does not show tooltip content until a detailed slot is hovered', () => {
    renderWithProviders(
      <TimeGrid
        slots={[
          { id: '1', timeLabel: '9:00 AM', status: 'available' },
          { id: '2', timeLabel: '9:30 AM', status: 'booked', detail: 'Booked — reserved' },
        ]}
      />,
    );

    // The tooltip's content is only mounted once opened (hover/focus) --
    // confirms a detailed slot doesn't leak its detail text into the DOM
    // up front, unlike a plain always-visible label would.
    expect(screen.queryByText('Booked — reserved')).not.toBeInTheDocument();
  });
});
