import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TimeSlot } from './time-slot';

describe('TimeSlot', () => {
  it('renders an available slot as an interactive button when onSelect is given', async () => {
    const onSelect = vi.fn();
    render(<TimeSlot time="9:00 AM" status="available" onSelect={onSelect} />);

    const button = screen.getByRole('button', { name: /9:00 AM/ });
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('renders a blocked slot as static, non-interactive content', () => {
    render(<TimeSlot time="7:00 AM" status="blocked" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('7:00 AM')).toBeInTheDocument();
  });

  it('renders a booked slot with its label, also non-interactive', () => {
    render(<TimeSlot time="10:00 AM" status="booked" label="Follow-up" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Follow-up')).toBeInTheDocument();
  });
});
