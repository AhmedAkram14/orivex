import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/shared/test/render-with-providers';

import { TimezoneSection } from './timezone-section';

describe('TimezoneSection', () => {
  it('renders the static, read-only timezone label -- no loading state, no network call', () => {
    renderWithProviders(<TimezoneSection />);

    expect(screen.getByText('Timezone')).toBeInTheDocument();
    expect(screen.getByText(/Timezone: Africa\/Cairo \(GMT[+-]\d/)).toBeInTheDocument();
  });
});
