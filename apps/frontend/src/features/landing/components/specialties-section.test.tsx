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
});
