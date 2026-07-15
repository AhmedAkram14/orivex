import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { FilterTabs } from './filter-tabs';

const options = [
  { value: 'all' as const, label: 'All' },
  { value: 'upcoming' as const, label: 'Upcoming' },
];

describe('FilterTabs', () => {
  it('calls onChange with the selected filter value', async () => {
    const onChange = vi.fn();
    renderWithProviders(<FilterTabs value="all" onChange={onChange} options={options} />);

    await userEvent.click(screen.getByRole('tab', { name: 'Upcoming' }));

    expect(onChange).toHaveBeenCalledWith('upcoming');
  });
});
