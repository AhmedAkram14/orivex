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
    insuranceProviders: [],
    publications: [],
    awards: [],
    workExperience: [],
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
                patientProfileId: 'patient-profile-1',
                patientName: 'Amina Youssef',
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
            writtenReviewCount: 1,
          },
        }),
      ),
    );

    renderWithProviders(<DoctorProfileView profile={buildProfile()} />);

    expect(await screen.findByText('5.0')).toBeInTheDocument();
    expect(screen.getByText('Very thorough and kind.')).toBeInTheDocument();
  });

  it('renders the real workExperience timeline and insuranceProviders, with honest empty states when both are absent', async () => {
    renderWithProviders(
      <DoctorProfileView
        profile={buildProfile({
          insuranceProviders: ['Misr Insurance', 'AXA'],
          workExperience: [
            {
              id: 'work-1',
              organizationName: 'Cairo University Hospitals',
              position: 'Consultant Cardiologist',
              startDate: '2021-03-01T00:00:00.000Z',
            },
          ],
        })}
      />,
    );

    expect(await screen.findByText('Consultant Cardiologist')).toBeInTheDocument();
    expect(screen.getByText('Cairo University Hospitals')).toBeInTheDocument();
    expect(screen.getByText('Misr Insurance')).toBeInTheDocument();
    expect(screen.getByText('AXA')).toBeInTheDocument();
  });

  it('renders honest empty states for experience/insurance/publications/awards when the profile has none', async () => {
    renderWithProviders(<DoctorProfileView profile={buildProfile()} />);

    expect(await screen.findByText('No work experience on record yet')).toBeInTheDocument();
    expect(screen.getByText('No insurance providers on record')).toBeInTheDocument();
    expect(screen.getByText('No publications on record')).toBeInTheDocument();
    expect(screen.getByText('No awards on record')).toBeInTheDocument();
  });

  it('omits every workspace-only affordance (Edit, Quick Actions, Profile Completion) in the public/patient-facing variant', async () => {
    renderWithProviders(<DoctorProfileView profile={buildProfile()} variant="public" />);

    await screen.findByText('Contact information');
    expect(screen.queryByText('Edit profile')).not.toBeInTheDocument();
    expect(screen.queryByText('Quick Actions')).not.toBeInTheDocument();
    expect(screen.queryByText('Profile Completion')).not.toBeInTheDocument();
    expect(screen.queryByText('Availability')).not.toBeInTheDocument();
  });

  it('shows the workspace sidebar (Quick Actions, Profile Completion) when an onEdit handler is provided', async () => {
    renderWithProviders(<DoctorProfileView profile={buildProfile()} onEdit={() => {}} />);

    expect(await screen.findByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Profile Completion')).toBeInTheDocument();
  });
});
