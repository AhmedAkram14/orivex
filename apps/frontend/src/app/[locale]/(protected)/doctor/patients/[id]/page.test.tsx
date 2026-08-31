import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import DoctorPatientChartPage from './page';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/patients/patient-profile-1',
  useParams: () => ({ locale: 'en', id: 'patient-profile-1' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

const PROFILE_RESPONSE = {
  id: 'patient-profile-1',
  accountId: 'account-patient-1',
  fullName: 'Fady Nassar',
  email: 'patient17@orivex.dev',
  phoneNumber: '+201117876543',
  dateOfBirth: '1999-01-15T00:00:00.000Z',
  gender: 'male',
  bloodType: 'O+',
  allergies: 'Penicillin',
  chronicDiseases: undefined,
  insuranceProviderId: undefined,
  emergencyContacts: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={doctorState}>
          <DoctorPatientChartPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

function mockChartEndpoints(overrides: { reviews?: unknown[]; documents?: unknown[] } = {}) {
  server.use(
    http.get(`${env.apiBaseUrl}/doctor/patients/:id/profile`, () => HttpResponse.json({ data: PROFILE_RESPONSE })),
    http.get(`${env.apiBaseUrl}/doctor/patients/:id/appointments`, () => HttpResponse.json({ data: [] })),
    http.get(`${env.apiBaseUrl}/doctor/patients/:id/medical-records`, () => HttpResponse.json({ data: [] })),
    http.get(`${env.apiBaseUrl}/doctor/patients/:id/prescriptions`, () => HttpResponse.json({ data: [] })),
    http.get(`${env.apiBaseUrl}/doctor/patients/:id/documents`, () => HttpResponse.json({ data: overrides.documents ?? [] })),
    http.get(`${env.apiBaseUrl}/doctors/me`, () =>
      HttpResponse.json({
        data: {
          id: 'doctor-profile-1',
          accountId: '1',
          fullName: 'Dr. Sarah Ahmed',
          email: 'doctor@orivex.dev',
          licenseNumber: 'LIC-1',
          specialtyId: 'specialty-cardiology',
          languages: [],
          insuranceProviders: [],
          publications: [],
          awards: [],
          workExperience: [],
          createdAt: '2020-01-15T00:00:00.000Z',
          updatedAt: '2020-01-15T00:00:00.000Z',
        },
      }),
    ),
    http.get(`${env.apiBaseUrl}/doctors/:id/reviews`, () =>
      HttpResponse.json({
        data: {
          reviews: overrides.reviews ?? [],
          total: overrides.reviews?.length ?? 0,
          page: 1,
          limit: 20,
          averageRating: null,
          reviewCount: 0,
          writtenReviewCount: 0,
        },
      }),
    ),
  );
}

describe('DoctorPatientChartPage', () => {
  it("renders the real patient's profile, medical overview, and personal information", async () => {
    mockChartEndpoints();
    renderPage();

    expect(await screen.findByText('Fady Nassar')).toBeInTheDocument();
    expect(screen.getByText('O+')).toBeInTheDocument();
    expect(screen.getByText('Penicillin')).toBeInTheDocument();
    expect(screen.getByText('patient17@orivex.dev')).toBeInTheDocument();
  });

  it("shows Recent Feedback when this patient has reviewed the current doctor, without it dominating the page", async () => {
    mockChartEndpoints({
      reviews: [
        {
          id: 'review-1',
          consultationSessionId: 'session-1',
          doctorId: 'doctor-profile-1',
          patientProfileId: 'patient-profile-1',
          patientName: 'Fady Nassar',
          rating: 5,
          comment: 'Professional and reassuring.',
          createdAt: '2026-08-20T00:00:00.000Z',
        },
      ],
    });
    renderPage();

    expect(await screen.findByText('Recent feedback')).toBeInTheDocument();
    expect(screen.getByText('“Professional and reassuring.”')).toBeInTheDocument();
    // Still shows the medical overview alongside it -- feedback is not the
    // only content on the page.
    expect(screen.getByText('O+')).toBeInTheDocument();
  });

  it('omits Recent Feedback entirely when this patient has never reviewed the current doctor', async () => {
    mockChartEndpoints({ reviews: [] });
    renderPage();

    await screen.findByText('Fady Nassar');
    expect(screen.queryByText('Recent feedback')).not.toBeInTheDocument();
  });

  it('renders real clinical documents with their type and date in the Documents tab', async () => {
    mockChartEndpoints({
      documents: [
        {
          id: 'document-demo-1-1',
          purpose: 'lab_report',
          contentType: 'image/jpeg',
          createdAt: '2026-08-21T00:00:00.000Z',
          signedUrl: '/demo/documents/document-demo-1-1',
        },
      ],
    });
    renderPage();

    await screen.findByText('Fady Nassar');
    await userEvent.click(screen.getByRole('tab', { name: 'Documents' }));

    expect(await screen.findByText('Lab report')).toBeInTheDocument();
    expect(screen.getByText('Aug 21, 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/demo/documents/document-demo-1-1');
  });

  it('shows an honest empty state in the Documents tab for a patient with no clinical documents', async () => {
    mockChartEndpoints({ documents: [] });
    renderPage();

    await screen.findByText('Fady Nassar');
    await userEvent.click(screen.getByRole('tab', { name: 'Documents' }));

    expect(await screen.findByText('No clinical documents uploaded')).toBeInTheDocument();
  });

  it('shows an ownership-safe not-found state when the doctor has no relationship with this patient', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/profile`, () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Patient not found.', requestId: 'mock', timestamp: new Date().toISOString() } },
          { status: 404 },
        ),
      ),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/appointments`, () => HttpResponse.json({ data: [] })),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/medical-records`, () => HttpResponse.json({ data: [] })),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/prescriptions`, () => HttpResponse.json({ data: [] })),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/documents`, () => HttpResponse.json({ data: [] })),
    );
    renderPage();

    expect(await screen.findByText('Patient not found')).toBeInTheDocument();
  });
});
