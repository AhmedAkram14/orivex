import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { RecordDownloadButton } from './record-download-button';

describe('RecordDownloadButton', () => {
  it('renders a real download link with the given href', () => {
    renderWithProviders(<RecordDownloadButton href="/files/report.pdf" label="Download report" />);

    const link = screen.getByRole('link', { name: /Download report/ });
    expect(link).toHaveAttribute('href', '/files/report.pdf');
    expect(link).toHaveAttribute('download');
  });
});
