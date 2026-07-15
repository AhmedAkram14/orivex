import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DateNavigation } from './date-navigation';

describe('DateNavigation', () => {
  it('calls onPrevious, onToday, and onNext when their controls are activated', async () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const onToday = vi.fn();

    render(
      <DateNavigation
        onPrevious={onPrevious}
        onNext={onNext}
        onToday={onToday}
        todayLabel="Today"
        previousLabel="Previous week"
        nextLabel="Next week"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }));

    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onToday).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
