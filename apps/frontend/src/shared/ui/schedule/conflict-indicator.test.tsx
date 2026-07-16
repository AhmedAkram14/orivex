import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { ConflictIndicator } from './conflict-indicator';

describe('ConflictIndicator', () => {
  it('renders the given conflict message as an alert', () => {
    renderWithProviders(<ConflictIndicator message="Outside working hours" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Outside working hours');
  });
});
