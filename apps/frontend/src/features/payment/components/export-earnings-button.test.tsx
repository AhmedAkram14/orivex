import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { useExportDoctorEarnings } from '@/features/payment/hooks/use-export-doctor-earnings';
import enMessages from '../../../../messages/en.json';

import { ExportEarningsButton } from './export-earnings-button';

vi.mock('@/features/payment/hooks/use-export-doctor-earnings', () => ({
  useExportDoctorEarnings: vi.fn(),
}));

function renderButton() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
      <ExportEarningsButton filter={{ dateFrom: '2026-01-01', dateTo: '2026-01-31' }} />
    </NextIntlClientProvider>,
  );
}

describe('ExportEarningsButton', () => {
  it('calls exportEarnings with the given filter when clicked', async () => {
    const exportEarnings = vi.fn();
    vi.mocked(useExportDoctorEarnings).mockReturnValue({ exportEarnings, isExporting: false, error: null });

    renderButton();
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(exportEarnings).toHaveBeenCalledWith({ dateFrom: '2026-01-01', dateTo: '2026-01-31' });
  });

  it('disables the button and shows the exporting label while in flight', () => {
    vi.mocked(useExportDoctorEarnings).mockReturnValue({ exportEarnings: vi.fn(), isExporting: true, error: null });

    renderButton();

    expect(screen.getByRole('button', { name: 'Exporting…' })).toBeDisabled();
  });

  it('shows an inline error message when the export fails', () => {
    vi.mocked(useExportDoctorEarnings).mockReturnValue({ exportEarnings: vi.fn(), isExporting: false, error: new Error('boom') });

    renderButton();

    expect(screen.getByRole('alert')).toHaveTextContent('Export failed. Try again.');
  });
});
