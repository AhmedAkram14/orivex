import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('renders the given label', () => {
    renderWithProviders(<StatusBadge tone="available" label="Available" />);
    expect(screen.getByText('Available')).toBeInTheDocument();
  });
});
