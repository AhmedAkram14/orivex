import { screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';

import { DoctorReviewsList } from './doctor-reviews-list';

const DOCTOR_PROFILE_ID = 'doctor-profile-1';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('DoctorReviewsList', () => {
  it('shows an empty state when there are no written reviews', async () => {
    // Doctor Profile Redesign (2026-08-02): `consultation-store.ts`'s default
    // handler now seeds a few realistic reviews for this same doctor id (so
    // the redesigned Profile page has real content to render in dev), so this
    // "genuinely zero reviews" case is exercised the same way
    // `DoctorDashboardPage.test.tsx` proves its own empty-state path -- by
    // overriding the handler back to an empty result for this one test.
    server.use(
      http.get(`${env.apiBaseUrl}/doctors/:id/reviews`, () =>
        HttpResponse.json({
          data: { reviews: [], total: 0, page: 1, limit: 20, averageRating: null, reviewCount: 0, writtenReviewCount: 0 },
        }),
      ),
    );

    renderWithProviders(<DoctorReviewsList doctorProfileId={DOCTOR_PROFILE_ID} />);

    expect(await screen.findByText('No written reviews yet.')).toBeInTheDocument();
  });

  it('renders only reviews that have a written comment, never rating-only ones', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/doctors/:id/reviews`, () =>
        HttpResponse.json({
          data: {
            reviews: [
              {
                id: 'review-1',
                consultationSessionId: 'session-1',
                doctorId: DOCTOR_PROFILE_ID,
                patientProfileId: 'patient-profile-1',
                patientName: 'Amina Youssef',
                patientAvatarUrl: '/demo/avatars/patient-01.png',
                rating: 5,
                comment: 'Excellent bedside manner.',
                createdAt: '2026-07-20T00:00:00.000Z',
              },
              {
                id: 'review-2',
                consultationSessionId: 'session-2',
                doctorId: DOCTOR_PROFILE_ID,
                patientProfileId: 'patient-profile-2',
                patientName: 'Karim Fathy',
                rating: 3,
                comment: null,
                createdAt: '2026-07-21T00:00:00.000Z',
              },
            ],
            total: 2,
            page: 1,
            limit: 20,
            averageRating: 4,
            reviewCount: 2,
            writtenReviewCount: 1,
          },
        }),
      ),
    );

    renderWithProviders(<DoctorReviewsList doctorProfileId={DOCTOR_PROFILE_ID} />);

    expect(await screen.findByText('Excellent bedside manner.')).toBeInTheDocument();
    expect(screen.queryByText('No written reviews yet.')).not.toBeInTheDocument();

    // Reviewer identity is real and public: name is shown and links to the
    // minimal public patient-profile page, never an anonymous placeholder.
    // Both the avatar and the name render as separate links to that page.
    const reviewerLinks = screen.getAllByRole('link', { name: 'Amina Youssef' });
    expect(reviewerLinks.length).toBeGreaterThan(0);
    for (const link of reviewerLinks) {
      expect(link).toHaveAttribute('href', '/en/patients/patient-profile-1');
    }
    expect(screen.queryByText('Karim Fathy')).not.toBeInTheDocument();
  });
});
