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
                rating: 5,
                comment: 'Excellent bedside manner.',
                createdAt: '2026-07-20T00:00:00.000Z',
              },
              {
                id: 'review-2',
                consultationSessionId: 'session-2',
                doctorId: DOCTOR_PROFILE_ID,
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
          },
        }),
      ),
    );

    renderWithProviders(<DoctorReviewsList doctorProfileId={DOCTOR_PROFILE_ID} />);

    expect(await screen.findByText('Excellent bedside manner.')).toBeInTheDocument();
    expect(screen.queryByText('No written reviews yet.')).not.toBeInTheDocument();
  });
});
