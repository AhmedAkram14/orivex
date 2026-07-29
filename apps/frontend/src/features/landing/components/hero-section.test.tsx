import { screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/shared/test/render-with-providers';

import { HeroSection } from './hero-section';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('HeroSection', () => {
  it('links both CTAs to real routes and shows only the real, backed stats', async () => {
    renderWithProviders(<HeroSection />);

    expect(screen.getByRole('link', { name: /Find a Doctor/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/patient/doctors'),
    );
    expect(screen.getByRole('link', { name: /Apply as Doctor/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/register'),
    );

    await waitFor(() => expect(screen.getAllByText('1+').length).toBe(2)); // 1 verified doctor, 1 specialty with doctors
    expect(screen.getByText('Verified Doctors')).toBeInTheDocument();
    expect(screen.getByText('Specialties')).toBeInTheDocument();
    expect(screen.queryByText(/happy patients/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/uptime/i)).not.toBeInTheDocument();
  });
});
