import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { DosageVisualization } from './dosage-visualization';

describe('DosageVisualization', () => {
  it('exposes an accessible label describing the frequency', () => {
    renderWithProviders(<DosageVisualization dosesPerDay={2} label="Twice daily" />);

    expect(screen.getByRole('img', { name: 'Twice daily' })).toBeInTheDocument();
  });

  it('shows an overflow marker beyond the visible cap', () => {
    renderWithProviders(<DosageVisualization dosesPerDay={9} label="Nine times daily" />);

    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('shows no overflow marker at or under the cap', () => {
    renderWithProviders(<DosageVisualization dosesPerDay={3} label="Three times daily" />);

    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });
});
