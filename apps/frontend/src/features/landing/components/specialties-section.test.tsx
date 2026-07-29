import { screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/shared/test/render-with-providers';

import { SpecialtiesSection } from './specialties-section';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('SpecialtiesSection', () => {
  it('shows only specialties with a real doctor count, each linking to the filtered directory', async () => {
    renderWithProviders(<SpecialtiesSection />);

    expect(await screen.findByText('Cardiology')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('1 doctors')).toBeInTheDocument());

    // Dermatology/Pediatrics have zero seeded doctors -- never shown as a dead-end choice.
    expect(screen.queryByText('Dermatology')).not.toBeInTheDocument();
    expect(screen.queryByText('Pediatrics')).not.toBeInTheDocument();

    const link = screen.getByText('Cardiology').closest('a');
    expect(link).toHaveAttribute('href', expect.stringContaining('/patient/doctors?specialtyId='));
  });

  it('shows the real specialty/doctor counts in the stats bar, never a fabricated satisfaction metric', async () => {
    renderWithProviders(<SpecialtiesSection />);

    await screen.findByText('Cardiology');

    expect(screen.getAllByText('1+').length).toBe(2); // 1 specialty with doctors, 1 total verified doctor
    expect(screen.getByText('Specialties')).toBeInTheDocument();
    expect(screen.getByText('Verified Doctors')).toBeInTheDocument();
    expect(screen.queryByText(/satisfaction/i)).not.toBeInTheDocument();
    expect(screen.getByText('Verified Specialists')).toBeInTheDocument();
    expect(screen.getByText('View Doctors')).toBeInTheDocument();
  });

  it("shows each card's category tagline, keyed off the specialty itself (not its position), so it stays stable across re-sorts", async () => {
    renderWithProviders(<SpecialtiesSection />);

    await screen.findByText('Cardiology');

    expect(screen.getByText('Heart and cardiovascular care from trusted specialists.')).toBeInTheDocument();
  });
});
