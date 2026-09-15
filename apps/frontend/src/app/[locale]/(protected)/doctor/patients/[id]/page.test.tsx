import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
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

const replace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/patients/patient-profile-1',
  useParams: () => ({ locale: 'en', id: 'patient-profile-1' }),
  useSearchParams: () => mockSearchParams,
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  replace.mockClear();
  mockSearchParams = new URLSearchParams();
});
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

  it('treats a Requested appointment whose date has already passed as a past appointment, not "upcoming" -- regression: this used to bucket on status alone, so a stale request that was never approved or declined stayed "upcoming" forever, disagreeing with the Patients list page\'s own (date-aware) count for the exact same appointment', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/profile`, () => HttpResponse.json({ data: PROFILE_RESPONSE })),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/appointments`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'appointment-stale',
              scheduledAt: '2020-01-01T10:00:00.000Z',
              doctorId: 'doctor-profile-1',
              doctorName: 'Dr. Sarah Ahmed',
              specialization: 'Cardiology',
              specializationAr: null,
              status: 'requested',
              consultationType: 'paid',
              reasonForVisit: null,
              consultationSessionId: null,
              paymentRequired: true,
            },
            {
              id: 'appointment-real-upcoming',
              scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
              doctorId: 'doctor-profile-1',
              doctorName: 'Dr. Sarah Ahmed',
              specialization: 'Cardiology',
              specializationAr: null,
              status: 'confirmed',
              consultationType: 'free',
              reasonForVisit: null,
              consultationSessionId: null,
              paymentRequired: false,
            },
          ],
        }),
      ),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/medical-records`, () => HttpResponse.json({ data: [] })),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/prescriptions`, () => HttpResponse.json({ data: [] })),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/documents`, () => HttpResponse.json({ data: [] })),
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
          data: { reviews: [], total: 0, page: 1, limit: 20, averageRating: null, reviewCount: 0, writtenReviewCount: 0 },
        }),
      ),
    );
    renderPage();

    await screen.findByText('Fady Nassar');

    // The stat strip's "Upcoming appointments" count only counts the one
    // genuinely future appointment, not the stale Requested one.
    const upcomingStat = (await screen.findByText('Upcoming appointments')).closest('div');
    expect(upcomingStat).not.toBeNull();
    expect(within(upcomingStat as HTMLElement).getByText('1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Consultations' }));

    const upcomingSection = (await screen.findByRole('heading', { name: 'Upcoming appointments' })).closest('.rounded-2xl');
    expect(upcomingSection).not.toBeNull();
    expect(within(upcomingSection as HTMLElement).queryByText('Waiting doctor approval')).not.toBeInTheDocument();

    const previousSection = screen.getByRole('heading', { name: 'Previous visits' }).closest('.rounded-2xl');
    expect(previousSection).not.toBeNull();
    expect(within(previousSection as HTMLElement).getByText('Waiting doctor approval')).toBeInTheDocument();
  });

  it('renders a breadcrumb trail back to the Patients list', async () => {
    mockChartEndpoints();
    renderPage();

    await screen.findByText('Fady Nassar');
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Patients')).toBeInTheDocument();
  });

  it("uses the patient's real name as the page's H1, not the static word \"Patient\"", async () => {
    mockChartEndpoints();
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Fady Nassar' })).toBeInTheDocument();
  });

  it('seeds the active tab from ?tab= so a refresh (or a shared link) lands on the same tab, not always Overview', async () => {
    mockSearchParams = new URLSearchParams('tab=consultations');
    mockChartEndpoints();
    renderPage();

    await screen.findByText('Fady Nassar');
    expect(screen.getByRole('tab', { name: 'Consultations' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'false');
  });

  it('keeps the allergy/condition strip visible on every tab, not just Overview', async () => {
    mockChartEndpoints();
    renderPage();

    await screen.findByText('Fady Nassar');
    expect(screen.getByText('Penicillin')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Documents' }));
    expect(await screen.findByText('No clinical documents uploaded')).toBeInTheDocument();
    expect(screen.getByText('Penicillin')).toBeInTheDocument();
  });

  it("shows reason for visit, consultation type, and duration on a consultations row -- never the viewing doctor's own name/specialization back to themselves", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/profile`, () => HttpResponse.json({ data: PROFILE_RESPONSE })),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/appointments`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'appointment-past-1',
              scheduledAt: '2026-08-01T10:00:00.000Z',
              endTime: '2026-08-01T10:30:00.000Z',
              doctorId: 'doctor-profile-1',
              doctorName: 'Dr. Sarah Ahmed',
              specialization: 'Cardiology',
              specializationAr: null,
              status: 'completed',
              consultationType: 'paid',
              reasonForVisit: 'Follow-up chest pain',
              consultationSessionId: 'session-1',
              paymentRequired: false,
            },
          ],
        }),
      ),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/medical-records`, () => HttpResponse.json({ data: [] })),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/prescriptions`, () => HttpResponse.json({ data: [] })),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/documents`, () => HttpResponse.json({ data: [] })),
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
          data: { reviews: [], total: 0, page: 1, limit: 20, averageRating: null, reviewCount: 0, writtenReviewCount: 0 },
        }),
      ),
    );
    renderPage();

    await screen.findByText('Fady Nassar');
    await userEvent.click(screen.getByRole('tab', { name: 'Consultations' }));

    const previousSection = (await screen.findByRole('heading', { name: 'Previous visits' })).closest('.rounded-2xl');
    expect(previousSection).not.toBeNull();
    const section = within(previousSection as HTMLElement);
    expect(section.getByText('Follow-up chest pain')).toBeInTheDocument();
    expect(section.getByText('Paid consultation')).toBeInTheDocument();
    expect(section.getByText('30 min')).toBeInTheDocument();
    expect(section.queryByText('Dr. Sarah Ahmed')).not.toBeInTheDocument();
    expect(section.queryByText('Cardiology')).not.toBeInTheDocument();
  });

  // Audit finding #4 / Phase 2: the doctor must be able to approve/decline a
  // pending request from the patient's own chart (Consultations tab), not
  // only from the separate Queue page.
  it('lets the doctor approve a Requested appointment from the Consultations tab', async () => {
    let approveCallCount = 0;
    server.use(
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/profile`, () => HttpResponse.json({ data: PROFILE_RESPONSE })),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/appointments`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'appointment-pending-1',
              scheduledAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
              doctorId: 'doctor-profile-1',
              doctorName: 'Dr. Sarah Ahmed',
              specialization: 'Cardiology',
              specializationAr: null,
              status: 'requested',
              consultationType: 'free',
              reasonForVisit: 'Follow-up',
              consultationSessionId: null,
              paymentRequired: false,
            },
          ],
        }),
      ),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/medical-records`, () => HttpResponse.json({ data: [] })),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/prescriptions`, () => HttpResponse.json({ data: [] })),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/documents`, () => HttpResponse.json({ data: [] })),
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
          data: { reviews: [], total: 0, page: 1, limit: 20, averageRating: null, reviewCount: 0, writtenReviewCount: 0 },
        }),
      ),
      http.patch(`${env.apiBaseUrl}/appointments/:id/approve`, ({ params }) => {
        approveCallCount += 1;
        return HttpResponse.json({ data: { id: params.id, status: 'confirmed' } });
      }),
    );
    renderPage();

    await screen.findByText('Fady Nassar');
    await userEvent.click(screen.getByRole('tab', { name: 'Consultations' }));
    expect(await screen.findByText('Follow-up')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(approveCallCount).toBe(1));
  });

  it('lets the doctor decline a Requested appointment (with an optional reason) from the Consultations tab', async () => {
    let declineCallCount = 0;
    let declineBody: unknown;
    server.use(
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/profile`, () => HttpResponse.json({ data: PROFILE_RESPONSE })),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/appointments`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'appointment-pending-2',
              scheduledAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
              doctorId: 'doctor-profile-1',
              doctorName: 'Dr. Sarah Ahmed',
              specialization: 'Cardiology',
              specializationAr: null,
              status: 'requested',
              consultationType: 'paid',
              reasonForVisit: 'Specialist consultation',
              consultationSessionId: null,
              paymentRequired: true,
            },
          ],
        }),
      ),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/medical-records`, () => HttpResponse.json({ data: [] })),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/prescriptions`, () => HttpResponse.json({ data: [] })),
      http.get(`${env.apiBaseUrl}/doctor/patients/:id/documents`, () => HttpResponse.json({ data: [] })),
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
          data: { reviews: [], total: 0, page: 1, limit: 20, averageRating: null, reviewCount: 0, writtenReviewCount: 0 },
        }),
      ),
      http.patch(`${env.apiBaseUrl}/appointments/:id/decline`, async ({ params, request }) => {
        declineCallCount += 1;
        declineBody = await request.json();
        return HttpResponse.json({ data: { id: params.id, status: 'cancelled' } });
      }),
    );
    renderPage();

    await screen.findByText('Fady Nassar');
    await userEvent.click(screen.getByRole('tab', { name: 'Consultations' }));
    expect(await screen.findByText('Specialist consultation')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Decline' }));
    await userEvent.type(screen.getByLabelText('Reason (optional)'), 'Fully booked that week');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm decline' }));

    await waitFor(() => expect(declineCallCount).toBe(1));
    expect(declineBody).toEqual({ reason: 'Fully booked that week' });
  });

  // Write Prescription (Phase 3.2): reuses the extracted PrescriptionPanel
  // (Phase 3.1) in a Dialog, launched from the Prescriptions tab against a
  // past completed appointment's ConsultationSession.
  describe('Write prescription', () => {
    function mockOneCompletedAppointment() {
      server.use(
        http.get(`${env.apiBaseUrl}/doctor/patients/:id/appointments`, () =>
          HttpResponse.json({
            data: [
              {
                id: 'appointment-completed-1',
                scheduledAt: '2026-08-01T10:00:00.000Z',
                doctorId: 'doctor-profile-1',
                doctorName: 'Dr. Sarah Ahmed',
                specialization: 'Cardiology',
                specializationAr: null,
                status: 'completed',
                consultationType: 'paid',
                reasonForVisit: 'Follow-up chest pain',
                consultationSessionId: 'session-1',
                paymentRequired: false,
              },
            ],
          }),
        ),
        http.get(`${env.apiBaseUrl}/consultations/:id/summary`, () =>
          HttpResponse.json({
            data: {
              session: { id: 'session-1', appointmentId: 'appointment-completed-1', state: 'completed', completionReason: 'completed', startedAt: '2026-08-01T10:00:00.000Z', closedAt: '2026-08-01T10:30:00.000Z' },
              appointment: { id: 'appointment-completed-1', patientId: 'patient-profile-1', doctorId: 'doctor-profile-1', availabilityWindowId: 'window-1', consultationType: 'paid', status: 'completed', scheduledAt: '2026-08-01T10:00:00.000Z', reasonForVisit: 'Follow-up chest pain', rescheduledFromId: null },
              clinicalNotes: [],
              prescriptions: [],
              labRequests: [],
              diagnoses: [],
              vitalReadings: [],
              followUpRecommendation: null,
              feedback: null,
              journeys: [],
            },
          }),
        ),
      );
    }

    function mockTwoCompletedAppointments() {
      server.use(
        http.get(`${env.apiBaseUrl}/doctor/patients/:id/appointments`, () =>
          HttpResponse.json({
            data: [
              {
                id: 'appointment-completed-1',
                scheduledAt: '2026-08-01T10:00:00.000Z',
                doctorId: 'doctor-profile-1',
                doctorName: 'Dr. Sarah Ahmed',
                specialization: 'Cardiology',
                specializationAr: null,
                status: 'completed',
                consultationType: 'paid',
                reasonForVisit: 'Follow-up chest pain',
                consultationSessionId: 'session-1',
                paymentRequired: false,
              },
              {
                id: 'appointment-completed-2',
                scheduledAt: '2026-08-10T10:00:00.000Z',
                doctorId: 'doctor-profile-1',
                doctorName: 'Dr. Sarah Ahmed',
                specialization: 'Cardiology',
                specializationAr: null,
                status: 'completed',
                consultationType: 'free',
                reasonForVisit: 'Routine check-up',
                consultationSessionId: 'session-2',
                paymentRequired: false,
              },
            ],
          }),
        ),
        http.get(`${env.apiBaseUrl}/consultations/:id/summary`, ({ params }) =>
          HttpResponse.json({
            data: {
              session: { id: params.id, appointmentId: 'appointment-completed-1', state: 'completed', completionReason: 'completed', startedAt: '2026-08-01T10:00:00.000Z', closedAt: '2026-08-01T10:30:00.000Z' },
              appointment: { id: 'appointment-completed-1', patientId: 'patient-profile-1', doctorId: 'doctor-profile-1', availabilityWindowId: 'window-1', consultationType: 'paid', status: 'completed', scheduledAt: '2026-08-01T10:00:00.000Z', reasonForVisit: 'Follow-up chest pain', rescheduledFromId: null },
              clinicalNotes: [],
              prescriptions: [],
              labRequests: [],
              diagnoses: [],
              vitalReadings: [],
              followUpRecommendation: null,
              feedback: null,
              journeys: [],
            },
          }),
        ),
      );
    }

    it('auto-selects the session and opens PrescriptionPanel directly when exactly one eligible completed appointment exists', async () => {
      mockChartEndpoints();
      mockOneCompletedAppointment();
      renderPage();

      await screen.findByText('Fady Nassar');
      await userEvent.click(screen.getByRole('tab', { name: 'Prescriptions' }));
      await userEvent.click(await screen.findByRole('button', { name: 'Write prescription' }));

      expect(screen.queryByLabelText('Select a past visit')).not.toBeInTheDocument();
      expect(await screen.findByText('Record a diagnosis first to prescribe against it.')).toBeInTheDocument();
    });

    it('shows a session picker when multiple eligible completed appointments exist, then opens PrescriptionPanel for the chosen one', async () => {
      mockChartEndpoints();
      mockTwoCompletedAppointments();
      renderPage();

      await screen.findByText('Fady Nassar');
      await userEvent.click(screen.getByRole('tab', { name: 'Prescriptions' }));
      await userEvent.click(await screen.findByRole('button', { name: 'Write prescription' }));

      const picker = await screen.findByRole('combobox', { name: 'Select a past visit' });
      expect(screen.queryByText('Record a diagnosis first to prescribe against it.')).not.toBeInTheDocument();

      await userEvent.click(picker);
      await userEvent.click(await screen.findByRole('option', { name: /Follow-up chest pain/ }));

      expect(await screen.findByText('Record a diagnosis first to prescribe against it.')).toBeInTheDocument();
    });

    it('does not show a Write prescription button when there is no eligible completed appointment', async () => {
      mockChartEndpoints();
      renderPage();

      await screen.findByText('Fady Nassar');
      await userEvent.click(screen.getByRole('tab', { name: 'Prescriptions' }));

      expect(screen.queryByRole('button', { name: 'Write prescription' })).not.toBeInTheDocument();
    });
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
