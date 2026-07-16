import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { Legend } from './legend';

describe('Legend', () => {
  it('renders a label for every item', () => {
    renderWithProviders(
      <Legend
        items={[
          { id: 'available', label: 'Available', colorClassName: 'bg-success' },
          { id: 'booked', label: 'Booked', colorClassName: 'bg-primary' },
        ]}
      />,
    );

    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Booked')).toBeInTheDocument();
  });
});
