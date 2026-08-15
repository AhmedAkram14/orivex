import { screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/shared/test/render-with-providers';

import { SpecialtiesSection } from './specialties-section';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mobile-carousel + desktop-grid render each specialty card TWICE (CSS
// `sm:hidden`/`hidden sm:grid` picks the visible one at runtime; jsdom
// applies no such layout, so both trees exist at once) -- assertions use
// `getAllByText` and take the first match rather than assuming exactly one.
describe('SpecialtiesSection', () => {
  it('shows only specialties with a real doctor count, each linking to the filtered directory', async () => {
    renderWithProviders(<SpecialtiesSection />);

    expect((await screen.findAllByText('Cardiology'))[0]).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('1 doctors').length).toBeGreaterThan(0));

    // Dermatology/Pediatrics have zero seeded doctors -- never shown as a dead-end choice.
    expect(screen.queryByText('Dermatology')).not.toBeInTheDocument();
    expect(screen.queryByText('Pediatrics')).not.toBeInTheDocument();

    const link = screen.getAllByText('Cardiology')[0].closest('a');
    expect(link).toHaveAttribute('href', expect.stringContaining('/patient/doctors?specialtyId='));
  });

  it('shows the real specialty/doctor counts in the stats bar, never a fabricated satisfaction metric', async () => {
    renderWithProviders(<SpecialtiesSection />);

    await screen.findAllByText('Cardiology');

    // The stats bar itself is not duplicated (only the specialty cards are), so this stays exactly 2.
    expect(screen.getAllByText('1+').length).toBe(2); // 1 specialty with doctors, 1 total verified doctor
    expect(screen.getByText('Specialties')).toBeInTheDocument();
    expect(screen.getByText('Verified Doctors')).toBeInTheDocument();
    expect(screen.queryByText(/satisfaction/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('Verified Specialists').length).toBeGreaterThan(0);
    expect(screen.getAllByText('View Doctors').length).toBeGreaterThan(0);
  });

  it("shows each card's category tagline, keyed off the specialty itself (not its position), so it stays stable across re-sorts", async () => {
    renderWithProviders(<SpecialtiesSection />);

    await screen.findAllByText('Cardiology');

    expect(screen.getAllByText('Heart and cardiovascular care from trusted specialists.').length).toBeGreaterThan(0);
  });
});
