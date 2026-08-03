import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { useSpecialtiesList } from '@/features/reference/hooks/use-specialties-list';
import enMessages from '../../../../messages/en.json';

import { AnalyticsFiltersBar } from './analytics-filters-bar';

vi.mock('@/features/reference/hooks/use-specialties-list', () => ({
  useSpecialtiesList: vi.fn(),
}));

function renderBar(onChange = vi.fn()) {
  vi.mocked(useSpecialtiesList).mockReturnValue({ data: [{ id: 'spec-1', name: 'Cardiology' }] } as never);
  render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
      <AnalyticsFiltersBar preferences={{ refreshInterval: 'off' }} onChange={onChange} />
    </NextIntlClientProvider>,
  );
  return onChange;
}

describe('AnalyticsFiltersBar', () => {
  it('propagates a date-from change to onChange', async () => {
    const onChange = renderBar();

    await userEvent.type(screen.getByLabelText('From'), '2026-01-15');

    expect(onChange).toHaveBeenCalled();
  });

  it('propagates the Compare Periods toggle', async () => {
    const onChange = renderBar();

    await userEvent.click(screen.getByLabelText('Compare to previous period'));

    expect(onChange).toHaveBeenCalledWith({ comparePrevious: true });
  });

  it('propagates the Doctor ID free-text filter', async () => {
    const onChange = renderBar();

    await userEvent.type(screen.getByLabelText('Doctor ID'), 'd');

    expect(onChange).toHaveBeenCalledWith({ doctorId: 'd' });
  });
});
