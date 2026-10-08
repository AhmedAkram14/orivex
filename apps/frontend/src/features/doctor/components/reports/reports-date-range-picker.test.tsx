import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { getLast30DaysRange, ReportsDateRangePicker } from './reports-date-range-picker';
import enMessages from '../../../../../messages/en.json';

function renderPicker(onChange: (dateFrom: string, dateTo: string) => void) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
      <ReportsDateRangePicker dateFrom="2026-08-01" dateTo="2026-08-31" onChange={onChange} />
    </NextIntlClientProvider>,
  );
}

describe('ReportsDateRangePicker', () => {
  it('renders both date inputs (inside the custom-range popover) with the given controlled values', async () => {
    renderPicker(vi.fn());
    await userEvent.click(screen.getByRole('button', { name: /Custom range|–/ }));
    // Day / Month / Year selects (the shared DateField), not the browser's mm/dd/yyyy date input.
    const from = screen.getByRole('group', { name: 'From' });
    const to = screen.getByRole('group', { name: 'To' });
    expect(within(from).getByRole('combobox', { name: 'Day' })).toHaveValue('01');
    expect(within(from).getByRole('combobox', { name: 'Month' })).toHaveValue('08');
    expect(within(from).getByRole('combobox', { name: 'Year' })).toHaveValue('2026');
    expect(within(to).getByRole('combobox', { name: 'Day' })).toHaveValue('31');
  });

  it('calls onChange with a 7-day range when the "7 days" preset is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderPicker(onChange);

    await user.click(screen.getByRole('button', { name: '7 days' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const [dateFrom, dateTo] = onChange.mock.calls[0];
    const spanMs = new Date(dateTo).getTime() - new Date(dateFrom).getTime();
    expect(spanMs).toBeCloseTo(7 * 24 * 60 * 60 * 1000, -5);
  });

  it('calls onChange with a wide range when the "All time" preset is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderPicker(onChange);

    await user.click(screen.getByRole('button', { name: 'All time' }));

    const [dateFrom] = onChange.mock.calls[0];
    expect(dateFrom).toBe('2020-01-01');
  });

  it('editing the From input keeps the current To value', async () => {
    const onChange = vi.fn();
    renderPicker(onChange);
    await userEvent.click(screen.getByRole('button', { name: /Custom range|–/ }));

    fireEvent.change(
      within(screen.getByRole('group', { name: 'From' })).getByRole('combobox', { name: 'Month' }),
      {
        target: { value: '01' },
      },
    );

    expect(onChange).toHaveBeenCalledWith('2026-01-01', '2026-08-31');
  });
});

describe('getLast30DaysRange', () => {
  it('returns a trailing 30-day window ending today, matching the backend default', () => {
    const { dateFrom, dateTo } = getLast30DaysRange();
    const spanMs = new Date(dateTo).getTime() - new Date(dateFrom).getTime();
    expect(spanMs).toBeCloseTo(30 * 24 * 60 * 60 * 1000, -5);
  });
});
