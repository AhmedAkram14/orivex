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

  it('renders every real review, including a rating-only one with no written comment -- a review used to be dropped from this list entirely once it had no comment, even though it still counted toward the header\'s rating/review count, so it was invisible anywhere on the page', async () => {
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
    // The name is the one accessible link to that page -- the avatar beside
    // it links to the same destination but is `aria-hidden` (a decorative
    // duplicate, not a second unlabeled stop).
    const reviewerLink = screen.getByRole('link', { name: 'Amina Youssef' });
    expect(reviewerLink).toHaveAttribute('href', `/en/patients/patient-profile-1?doctorId=${DOCTOR_PROFILE_ID}`);

    // Karim Fathy's review has no written comment, but it's still a real
    // review -- shown with its stars, just no comment paragraph.
    const karimLink = screen.getByRole('link', { name: 'Karim Fathy' });
    expect(karimLink).toHaveAttribute('href', `/en/patients/patient-profile-2?doctorId=${DOCTOR_PROFILE_ID}`);
    // Phase 8: the star-rating display now carries a real localized
    // aria-label ("Rated 3 out of 5") instead of the raw "3/5" string.
    expect(screen.getByLabelText('Rated 3 out of 5')).toBeInTheDocument();
  });

  it('links reviewers to the real, authorized Doctor-facing Patient Chart when rendered in the workspace variant', async () => {
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
                rating: 5,
                comment: 'Excellent bedside manner.',
                createdAt: '2026-07-20T00:00:00.000Z',
              },
            ],
            total: 1,
            page: 1,
            limit: 20,
            averageRating: 5,
            reviewCount: 1,
            writtenReviewCount: 1,
          },
        }),
      ),
    );

    renderWithProviders(<DoctorReviewsList doctorProfileId={DOCTOR_PROFILE_ID} variant="workspace" />);

    await screen.findByText('Excellent bedside manner.');
    const reviewerLink = screen.getByRole('link', { name: 'Amina Youssef' });
    expect(reviewerLink).toHaveAttribute('href', '/en/doctor/patients/patient-profile-1');
  });
});
