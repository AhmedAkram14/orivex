import { screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { server } from '@/mocks/server';
import { clearFeedbackForTests } from '@/mocks/consultation-store';
import { renderWithProviders } from '@/shared/test/render-with-providers';

import { PopularDoctorsSection } from './popular-doctors-section';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('PopularDoctorsSection', () => {
  it('shows the real seeded doctor with an honest "no reviews yet" state and working CTAs', async () => {
    // Doctor Profile Redesign (2026-08-02): `consultation-store.ts`'s default
    // now seeds a few realistic reviews for this same doctor id (so the
    // redesigned Profile page has real content to render in dev). This
    // handler reads the review store directly (not through the
    // `/doctors/:id/reviews` HTTP route), so this "genuinely zero reviews"
    // case is exercised by clearing that store rather than an MSW override.
    clearFeedbackForTests();

    renderWithProviders(<PopularDoctorsSection />);

    expect(await screen.findByText('Dr. Sarah Ahmed')).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('No ratings yet')).toBeInTheDocument();
    expect(screen.getByText('12 Years Exp.')).toBeInTheDocument();
    expect(screen.getByText('Independent Practice')).toBeInTheDocument();
    // Reviewless doctor is never tagged "Top Rated"/"Most Booked".
    expect(screen.queryByText('Top Rated')).not.toBeInTheDocument();
    expect(screen.queryByText('Most Booked')).not.toBeInTheDocument();

    // Signed out: both actions are live and go to sign-in, which returns the visitor to this doctor.
    const viewProfileLink = screen.getByRole('link', { name: 'View Profile' });
    expect(viewProfileLink.getAttribute('href')).toContain('/login?returnTo=');
    expect(decodeURIComponent(viewProfileLink.getAttribute('href') ?? '')).toContain('/patient/doctors/doctor-profile-1');

    const bookLink = screen.getByRole('link', { name: /^Book$/ });
    expect(bookLink.getAttribute('href')).toContain('/login?returnTo=');
    expect(decodeURIComponent(bookLink.getAttribute('href') ?? '')).toContain('/patient/appointments/book?doctorId=doctor-profile-1');

    const viewAllLink = screen.getByRole('link', { name: /View All Doctors/ });
    expect(viewAllLink).toHaveAttribute('href', '/en/doctors');
  });
});
