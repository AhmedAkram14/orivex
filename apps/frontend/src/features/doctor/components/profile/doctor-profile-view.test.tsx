import { screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import type { DoctorProfile } from '@/features/doctor/api/types';

import { DoctorProfileView } from './doctor-profile-view';

function buildProfile(overrides: Partial<DoctorProfile> = {}): DoctorProfile {
  return {
    id: 'doctor-profile-1',
    accountId: 'user-doctor-1',
    fullName: 'Dr. Sarah Ahmed',
    email: 'doctor@orivex.dev',
    licenseNumber: 'LIC-2010-4471',
    specialtyId: 'specialty-cardiology',
    languages: ['en'],
    publications: [],
    awards: [],
    createdAt: '2020-01-15T00:00:00.000Z',
    updatedAt: '2020-01-15T00:00:00.000Z',
    ...overrides,
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('DoctorProfileView', () => {
  it('renders the real review-derived rating summary and written reviews, never a fabricated rating column', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/doctors/:id/reviews`, () =>
        HttpResponse.json({
          data: {
            reviews: [
              {
                id: 'review-1',
                consultationSessionId: 'session-1',
                doctorId: 'doctor-profile-1',
                rating: 5,
                comment: 'Very thorough and kind.',
                createdAt: '2026-07-20T00:00:00.000Z',
              },
            ],
            total: 1,
            page: 1,
            limit: 20,
            averageRating: 5,
            reviewCount: 1,
          },
        }),
      ),
    );

    renderWithProviders(<DoctorProfileView profile={buildProfile()} />);

    expect(await screen.findByText('5.0')).toBeInTheDocument();
    expect(screen.getByText('Very thorough and kind.')).toBeInTheDocument();
  });
});
