import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { EarningsDateRangePicker, getLast30DaysRange } from './earnings-date-range-picker';
import enMessages from '../../../../messages/en.json';

function renderPicker(onChange: (dateFrom: string, dateTo: string) => void) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
      <EarningsDateRangePicker dateFrom="2026-08-01" dateTo="2026-08-31" onChange={onChange} />
    </NextIntlClientProvider>,
  );
}

describe('EarningsDateRangePicker', () => {
  it('renders both date inputs with the given controlled values', () => {
    renderPicker(vi.fn());
    expect(screen.getByLabelText('From')).toHaveValue('2026-08-01');
    expect(screen.getByLabelText('To')).toHaveValue('2026-08-31');
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

  it('editing the From input keeps the current To value', () => {
    const onChange = vi.fn();
    renderPicker(onChange);

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-01' } });

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
