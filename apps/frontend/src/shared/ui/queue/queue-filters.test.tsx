import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QueueFilters } from './queue-filters';

describe('QueueFilters', () => {
  it('calls onChange with the selected filter value', async () => {
    const onChange = vi.fn();
    render(
      <QueueFilters
        value="all"
        onChange={onChange}
        options={[
          { value: 'all', label: 'All' },
          { value: 'waiting', label: 'Waiting' },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole('tab', { name: 'Waiting' }));
    expect(onChange).toHaveBeenCalledWith('waiting');
  });
});
