import { screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';

import { DoctorRatingSummary } from './doctor-rating-summary';

const DOCTOR_PROFILE_ID = 'doctor-profile-1';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('DoctorRatingSummary', () => {
  it('shows an honest "no reviews yet" state rather than a fabricated 0.0 rating', async () => {
    renderWithProviders(<DoctorRatingSummary doctorProfileId={DOCTOR_PROFILE_ID} />);

    expect(await screen.findByText('No reviews yet')).toBeInTheDocument();
  });

  it('renders the real average rating and review count once reviews exist', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/doctors/:id/reviews`, () =>
        HttpResponse.json({
          data: { reviews: [], total: 2, page: 1, limit: 20, averageRating: 4.5, reviewCount: 2 },
        }),
      ),
    );

    renderWithProviders(<DoctorRatingSummary doctorProfileId={DOCTOR_PROFILE_ID} />);

    await waitFor(() => expect(screen.getByText('4.5')).toBeInTheDocument());
    expect(screen.getByText('(2 reviews)')).toBeInTheDocument();
  });
});
