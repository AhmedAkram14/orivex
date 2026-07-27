import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { OnboardingFlow } from './onboarding-flow';
import { resetDoctorStore } from '@/mocks/doctor-store';
import { resetIdentityStore } from '@/mocks/identity-store';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import enMessages from '../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/onboarding',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

const base = () => env.apiBaseUrl;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetIdentityStore();
  resetDoctorStore();
});
afterAll(() => server.close());

function renderFlow() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <OnboardingFlow />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('OnboardingFlow', () => {
  // Onboarding Redesign (2026-07-21 proposal, Stage O.6): the shared
  // Personal Info step is now the wizard's leading step, ahead of
  // Professional Info -- this is the explicit "resume at the right step
  // still works with the new leading step inserted" regression the
  // proposal calls for.
  it('starts at the Personal Info step (Draft) when no doctor profile exists yet, then advances to Professional Info', async () => {
    server.use(
      http.get(`${base()}/doctors/me`, () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'not found', requestId: 'r', timestamp: new Date().toISOString() } },
          { status: 404 },
        ),
      ),
      // This test exercises the genuinely-blank-personal-info scenario --
      // `identity-store.ts`'s shared seed account now carries a filled-in
      // dateOfBirth/gender/nationalityId/address (needed for Stage O.7's
      // Patient Identity Verification tests), so it's overridden here back
      // to unset, matching a real account that has never completed the
      // shared Personal Info step yet.
      http.get(`${base()}/accounts/me`, () =>
        HttpResponse.json({
          data: {
            id: 'user-doctor-1',
            email: 'doctor@orivex.dev',
            role: 'doctor',
            status: 'active',
            displayName: 'Dr. Sarah Ahmed',
            preferredLanguage: 'en',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      ),
    );

    renderFlow();

    expect(await screen.findByLabelText('Date of birth')).toBeInTheDocument();
    expect(screen.queryByLabelText('License number')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Date of birth'), '1985-06-15');
    await userEvent.click(screen.getByRole('combobox', { name: 'Gender' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Female' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Nationality' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Egypt' }));
    await userEvent.type(screen.getByLabelText('Address'), '12 Tahrir Street, Cairo');
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

    expect(await screen.findByLabelText('License number')).toBeInTheDocument();
  }, 15000);

  // Onboarding Redesign (2026-07-21 proposal, Stage O.6): the redesigned
  // Professional Info step -- reference-data specialty dropdown,
  // Professional Rank, License Expiry Date, and "Independent Practice"
  // (no hospital/department required) all the way through to the
  // redesigned 7-slot Documents step.
  it('completes Personal Info then Professional Info (Independent Practice) and reaches the 7-slot Documents step', async () => {
    server.use(
      http.get(`${base()}/doctors/me`, () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'not found', requestId: 'r', timestamp: new Date().toISOString() } },
          { status: 404 },
        ),
      ),
      // See the previous test's comment: overridden back to a genuinely
      // blank personal-info account, since `identity-store.ts`'s shared seed
      // account now carries a filled-in dateOfBirth for Stage O.7's Patient
      // Identity Verification tests.
      http.get(`${base()}/accounts/me`, () =>
        HttpResponse.json({
          data: {
            id: 'user-doctor-1',
            email: 'doctor@orivex.dev',
            role: 'doctor',
            status: 'active',
            displayName: 'Dr. Sarah Ahmed',
            preferredLanguage: 'en',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      ),
    );

    renderFlow();

    await userEvent.type(await screen.findByLabelText('Date of birth'), '1985-06-15');
    await userEvent.click(screen.getByRole('combobox', { name: 'Gender' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Female' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Nationality' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Egypt' }));
    await userEvent.type(screen.getByLabelText('Address'), '12 Tahrir Street, Cairo');
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

    await userEvent.type(await screen.findByLabelText('License number'), 'LIC-9001');
    await userEvent.click(screen.getByRole('combobox', { name: 'Specialty' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Dermatology' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Professional rank' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Registrar' }));
    await userEvent.type(screen.getByLabelText('License expiry date'), '2031-01-01');
    await userEvent.click(screen.getByLabelText('English'));
    // Hospital defaults to "Independent Practice" -- no department field
    // should even render, so this is left untouched.
    await userEvent.click(screen.getByRole('button', { name: 'Create profile and continue' }));

    expect(await screen.findByText('National ID (front)')).toBeInTheDocument();
    expect(screen.getByText('Professional membership card')).toBeInTheDocument();
  }, 15000);

  it('resumes at the documents step (Draft) when a profile exists but nothing has been submitted', async () => {
    server.use(
      http.get(`${base()}/doctors/:id/verifications`, () => HttpResponse.json({ data: [] })),
    );

    renderFlow();

    expect(await screen.findByText('National ID (front)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Date of birth')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('License number')).not.toBeInTheDocument();
  });

  it('shows the Pending status and blocks the wizard when a verification is under review', async () => {
    server.use(
      http.get(`${base()}/doctors/:id/verifications`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'case-1',
              doctorId: 'doctor-profile-1',
              status: 'under_review',
              submittedAt: new Date().toISOString(),
              decidedAt: null,
            },
          ],
        }),
      ),
    );

    renderFlow();

    expect(await screen.findByText('Under review')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your application is being reviewed. You will gain access to the Doctor Portal automatically once approved.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('National ID (front)')).not.toBeInTheDocument();
  });

  // Onboarding Redesign (2026-07-21 proposal, Stage O.6): MoreInfoNeeded
  // gets its own friendlier copy now, distinct from Rejected's.
  it('shows the MoreInfoNeeded status with its own copy, distinct from Rejected', async () => {
    server.use(
      http.get(`${base()}/doctors/:id/verifications`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'case-1',
              doctorId: 'doctor-profile-1',
              status: 'more_info_needed',
              reason: 'Please upload a clearer photo of your medical license.',
              submittedAt: new Date().toISOString(),
              decidedAt: new Date().toISOString(),
            },
          ],
        }),
      ),
    );

    renderFlow();

    expect(await screen.findByText('More info needed')).toBeInTheDocument();
    expect(
      screen.getByText('We need one more thing from you before we can continue reviewing your application.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('You can edit your profile and documents, then resubmit for review.'),
    ).not.toBeInTheDocument();
  });

  it('shows the rejection reason and lets the applicant edit and resubmit', async () => {
    server.use(
      http.get(`${base()}/doctors/:id/verifications`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'case-1',
              doctorId: 'doctor-profile-1',
              status: 'rejected',
              reason: 'The submitted license number could not be verified.',
              submittedAt: new Date().toISOString(),
              decidedAt: new Date().toISOString(),
            },
          ],
        }),
      ),
    );

    renderFlow();

    expect(await screen.findByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('The submitted license number could not be verified.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Edit and resubmit' }));

    expect(await screen.findByLabelText('License number')).toBeInTheDocument();
  });

  // Regression: PATCH /doctors/me's real DTO never accepts licenseNumber
  // (only registration sets it, once) and the global ValidationPipe's
  // forbidNonWhitelisted rejects any extra field outright -- the license
  // number field is disabled (not removed) during resubmit, so it was
  // still riding along in the submitted form values.
  it('never sends licenseNumber on the resubmit PATCH, even though the disabled field still carries a value', async () => {
    server.use(
      http.get(`${base()}/doctors/:id/verifications`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'case-1',
              doctorId: 'doctor-profile-1',
              status: 'rejected',
              reason: 'The submitted license number could not be verified.',
              submittedAt: new Date().toISOString(),
              decidedAt: new Date().toISOString(),
            },
          ],
        }),
      ),
    );
    let patchBody: Record<string, unknown> | undefined;
    server.use(
      http.patch(`${base()}/doctors/me`, async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: { id: 'doctor-profile-1' } });
      }),
    );

    renderFlow();
    await screen.findByText('Rejected');
    await userEvent.click(screen.getByRole('button', { name: 'Edit and resubmit' }));

    await screen.findByLabelText('License number');
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

    await waitFor(() => expect(patchBody).toBeDefined());
    expect(patchBody).not.toHaveProperty('licenseNumber');
  });

  it('shows an approved message with a link to the Doctor Portal', async () => {
    server.use(
      http.get(`${base()}/doctors/:id/verifications`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'case-1',
              doctorId: 'doctor-profile-1',
              status: 'approved',
              submittedAt: new Date().toISOString(),
              decidedAt: new Date().toISOString(),
            },
          ],
        }),
      ),
    );

    renderFlow();

    expect(await screen.findByText('Approved')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Doctor Portal' })).toHaveAttribute('href', '/en/doctor');
  });
});
