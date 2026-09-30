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
  it('shows an honest "no ratings yet" state rather than a fabricated 0.0 rating', async () => {
    // Doctor Profile Redesign (2026-08-02): `consultation-store.ts`'s default
    // handler now seeds a few realistic reviews for this same doctor id (so
    // the redesigned Profile page has real content to render in dev), so this
    // "genuinely zero reviews" case is exercised the same way
    // `DoctorDashboardPage.test.tsx` proves its own empty-state path -- by
    // overriding the handler back to an empty result for this one test.
    server.use(
      http.get(`${env.apiBaseUrl}/doctors/:id/reviews`, () =>
        HttpResponse.json({ data: { reviews: [], total: 0, page: 1, limit: 20, averageRating: null, reviewCount: 0 } }),
      ),
    );

    renderWithProviders(<DoctorRatingSummary doctorProfileId={DOCTOR_PROFILE_ID} />);

    expect(await screen.findByText('No ratings yet')).toBeInTheDocument();
  });

  it('withholds the score below the confidence threshold, exactly like the doctor profile ("New — 2 ratings")', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/doctors/:id/reviews`, () =>
        HttpResponse.json({
          data: { reviews: [], total: 2, page: 1, limit: 20, averageRating: 4.5, reviewCount: 2 },
        }),
      ),
    );

    renderWithProviders(<DoctorRatingSummary doctorProfileId={DOCTOR_PROFILE_ID} />);

    expect(await screen.findByText('New — 2 ratings')).toBeInTheDocument();
    expect(screen.queryByText('4.5')).not.toBeInTheDocument();
  });

  it('shows the score once there are enough ratings (the shared MIN_RATING_COUNT_FOR_CONFIDENT_DISPLAY rule)', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/doctors/:id/reviews`, () =>
        HttpResponse.json({
          data: { reviews: [], total: 5, page: 1, limit: 20, averageRating: 4.5, reviewCount: 5 },
        }),
      ),
    );

    renderWithProviders(<DoctorRatingSummary doctorProfileId={DOCTOR_PROFILE_ID} />);

    // One line on the doctor card: "★ 4.5 · 5 ratings" (written reviews only when there are any).
    await waitFor(() => expect(screen.getByText('4.5')).toBeInTheDocument());
    expect(screen.getByText('5 ratings')).toBeInTheDocument();
    expect(screen.queryByText(/reviews?$/)).not.toBeInTheDocument();
  });
});
