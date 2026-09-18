import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { useExportDoctorReports } from '@/features/doctor/hooks/use-export-doctor-reports';
import enMessages from '../../../../../messages/en.json';

import { ExportReportsButton } from './export-reports-button';

vi.mock('@/features/doctor/hooks/use-export-doctor-reports', () => ({
  useExportDoctorReports: vi.fn(),
}));

function renderButton() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
      <ExportReportsButton filter={{ dateFrom: '2026-01-01', dateTo: '2026-01-31' }} />
    </NextIntlClientProvider>,
  );
}

describe('ExportReportsButton', () => {
  it('calls exportReports with the given filter when clicked', async () => {
    const exportReports = vi.fn();
    vi.mocked(useExportDoctorReports).mockReturnValue({ exportReports, isExporting: false, error: null });

    renderButton();
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(exportReports).toHaveBeenCalledWith({ dateFrom: '2026-01-01', dateTo: '2026-01-31' });
  });

  it('disables the button and shows the exporting label while in flight', () => {
    vi.mocked(useExportDoctorReports).mockReturnValue({ exportReports: vi.fn(), isExporting: true, error: null });

    renderButton();

    expect(screen.getByRole('button', { name: 'Exporting…' })).toBeDisabled();
  });

  it('shows an inline error message when the export fails', () => {
    vi.mocked(useExportDoctorReports).mockReturnValue({ exportReports: vi.fn(), isExporting: false, error: new Error('boom') });

    renderButton();

    expect(screen.getByRole('alert')).toHaveTextContent('Export failed. Try again.');
  });
});
