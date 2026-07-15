import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { TrendChart } from './trend-chart';

describe('TrendChart', () => {
  it('renders an accessible chart image for two or more readings', () => {
    renderWithProviders(<TrendChart values={[68, 70, 74]} label="Weight rising from 68 to 74 kg" />);

    expect(screen.getByRole('img', { name: 'Weight rising from 68 to 74 kg' })).toBeInTheDocument();
  });

  it('falls back to a text label instead of a broken chart for fewer than two readings', () => {
    renderWithProviders(<TrendChart values={[72]} label="Only one reading on record" />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Only one reading on record')).toBeInTheDocument();
  });
});
