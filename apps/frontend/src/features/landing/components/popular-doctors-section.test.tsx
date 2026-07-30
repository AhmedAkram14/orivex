import { screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/shared/test/render-with-providers';

import { PopularDoctorsSection } from './popular-doctors-section';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('PopularDoctorsSection', () => {
  it('shows the real seeded doctor with an honest "new doctor" state and working CTAs', async () => {
    renderWithProviders(<PopularDoctorsSection />);

    expect(await screen.findByText('Dr. Sarah Ahmed')).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('New Doctor')).toBeInTheDocument();
    expect(screen.getByText('Be the first to review')).toBeInTheDocument();
    expect(screen.getByText('12 Years Exp.')).toBeInTheDocument();
    expect(screen.getByText('Independent Practice')).toBeInTheDocument();
    // Reviewless doctor is never tagged "Top Rated"/"Most Booked".
    expect(screen.queryByText('Top Rated')).not.toBeInTheDocument();
    expect(screen.queryByText('Most Booked')).not.toBeInTheDocument();

    const viewProfileLink = screen.getByRole('link', { name: 'View Profile' });
    expect(viewProfileLink).toHaveAttribute('href', expect.stringContaining('/patient/doctors/doctor-profile-1'));

    const bookLink = screen.getByRole('link', { name: /Book Appointment/ });
    expect(bookLink).toHaveAttribute('href', expect.stringContaining('doctorId=doctor-profile-1'));

    const viewAllLink = screen.getByRole('link', { name: /View All Doctors/ });
    expect(viewAllLink).toHaveAttribute('href', expect.stringContaining('/patient/doctors'));
  });
});
