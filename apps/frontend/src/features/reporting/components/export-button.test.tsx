import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { useExportReport } from '@/features/reporting/hooks/use-export-report';
import enMessages from '../../../../messages/en.json';

import { ExportButton } from './export-button';

vi.mock('@/features/reporting/hooks/use-export-report', () => ({
  useExportReport: vi.fn(),
}));

function renderButton() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
      <ExportButton section="payments" filter={{}} />
    </NextIntlClientProvider>,
  );
}

describe('ExportButton', () => {
  it('calls exportReport with the section and filter when clicked', async () => {
    const exportReport = vi.fn();
    vi.mocked(useExportReport).mockReturnValue({ exportReport, isExporting: false, error: null });

    renderButton();
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(exportReport).toHaveBeenCalledWith('payments', {});
  });

  it('disables the button and shows the exporting label while in flight', () => {
    vi.mocked(useExportReport).mockReturnValue({ exportReport: vi.fn(), isExporting: true, error: null });

    renderButton();

    expect(screen.getByRole('button', { name: 'Exporting…' })).toBeDisabled();
  });

  it('shows an inline error message when the export fails', () => {
    vi.mocked(useExportReport).mockReturnValue({ exportReport: vi.fn(), isExporting: false, error: new Error('boom') });

    renderButton();

    expect(screen.getByRole('alert')).toHaveTextContent('Export failed. Try again.');
  });
});
