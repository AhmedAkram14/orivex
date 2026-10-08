import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { OnboardingFlow } from './onboarding-flow';
import { resetDoctorStore } from '@/mocks/doctor-store';
import { resetIdentityStore } from '@/mocks/identity-store';
import { server } from '@/mocks/server';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import { env } from '@/shared/lib/env';
import { ThemeProvider } from '@/shared/providers/theme-provider';
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
const now = () => new Date().toISOString();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetIdentityStore();
  resetDoctorStore();
});
afterAll(() => server.close());

const authState: AuthState = {
  status: 'authenticated',
  user: { id: 'user-applicant', email: 'applicant@orivex.dev', fullName: 'Ahmed Akram', roles: ['patient'] },
};

function renderFlow() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <ThemeProvider>
          <AuthContext.Provider value={authState}>
            <OnboardingFlow />
          </AuthContext.Provider>
        </ThemeProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

const noProfile = () =>
  http.get(`${base()}/doctors/me`, () =>
    HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'not found', requestId: 'r', timestamp: now() } }, { status: 404 }),
  );
// A genuinely blank account (the shared mock seed has personal info filled in for other tests).
const blankAccount = () =>
  http.get(`${base()}/accounts/me`, () =>
    HttpResponse.json({
      data: { id: 'user-applicant', email: 'applicant@orivex.dev', role: 'patient', status: 'active', displayName: 'Ahmed Akram', preferredLanguage: 'en', createdAt: now(), updatedAt: now() },
    }),
  );
const verifications = (status: string, reason?: string) =>
  http.get(`${base()}/doctors/:id/verifications`, () =>
    HttpResponse.json({ data: [{ id: 'case-1', doctorId: 'doctor-profile-1', status, reason, submittedAt: now(), decidedAt: status === 'under_review' ? null : now() }] }),
  );

type User = ReturnType<typeof userEvent.setup>;

async function pickDate(user: User, scope: HTMLElement, { day, month, year }: { day?: string; month: string; year: string }) {
  if (day) await user.selectOptions(within(scope).getByRole('combobox', { name: 'Day' }), day);
  await user.selectOptions(within(scope).getByRole('combobox', { name: 'Month' }), month);
  await user.selectOptions(within(scope).getByRole('combobox', { name: 'Year' }), year);
}

async function completePersonal(user: User) {
  await pickDate(user, await screen.findByRole('group', { name: 'Date of birth' }), { day: '15', month: '06', year: '1985' });
  await user.click(screen.getByRole('radio', { name: 'Female' }));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Nationality' }), 'country-eg');
  await user.type(screen.getByRole('textbox', { name: 'Address' }), '12 Tahrir Street, Cairo');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
}

async function completeProfessional(user: User) {
  await user.type(await screen.findByRole('textbox', { name: 'License number' }), 'LIC-9001');
  await pickDate(user, screen.getByRole('group', { name: 'License expiry date' }), { day: '01', month: '01', year: '2031' });
  await user.click(screen.getByRole('radio', { name: 'Registrar' }));
  await user.click(screen.getByRole('combobox', { name: /Specialty/ }));
  await user.click(await screen.findByRole('option', { name: /Dermatology/ }));
  await user.click(screen.getByRole('checkbox', { name: 'English' }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
}

describe('OnboardingFlow', () => {
  it('sends the same personal-info and profile bodies as before (dates YYYY-MM-DD, gender value, languages array, Independent Practice = no hospital)', async () => {
    const user = userEvent.setup();
    let personalBody: unknown;
    let registerBody: unknown;
    server.use(
      noProfile(),
      blankAccount(),
      http.patch(`${base()}/accounts/me`, async ({ request }) => {
        personalBody = await request.json();
        return HttpResponse.json({ data: { id: 'user-applicant', email: 'applicant@orivex.dev', role: 'patient', status: 'active', displayName: 'Ahmed Akram', preferredLanguage: 'en', createdAt: now(), updatedAt: now(), ...(personalBody as object) } });
      }),
      http.post(`${base()}/doctors`, async ({ request }) => {
        registerBody = await request.json();
        return HttpResponse.json({ data: { id: 'doctor-profile-new', accountId: 'user-applicant', ...(registerBody as object), workExperience: [], languages: ['en'], insuranceProviders: [] } }, { status: 201 });
      }),
    );
    renderFlow();

    expect(screen.queryByRole('textbox', { name: 'License number' })).not.toBeInTheDocument();
    await completePersonal(user);
    await waitFor(() => expect(personalBody).toBeDefined());
    expect(personalBody).toEqual({ dateOfBirth: '1985-06-15', gender: 'female', nationalityId: 'country-eg', address: '12 Tahrir Street, Cairo' });

    await completeProfessional(user);
    await waitFor(() => expect(registerBody).toBeDefined());
    expect(registerBody).toEqual({
      licenseNumber: 'LIC-9001',
      specialtyId: 'specialty-dermatology',
      languages: ['en'],
      insuranceProviders: [],
      professionalRank: 'registrar',
      licenseExpiryDate: '2031-01-01',
      workExperience: [],
    });

    // The documents step, grouped, with the progress line.
    expect(await screen.findByText('Upload 7 documents')).toBeInTheDocument();
    expect(screen.getByText('0 of 7 uploaded')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Identity' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qualifications' })).toBeInTheDocument();
    expect(screen.getByText('Professional membership card')).toBeInTheDocument();
  }, 30000);

  it('keeps unsaved edits when going back, and the stepper navigates to completed steps', async () => {
    const user = userEvent.setup();
    server.use(noProfile(), blankAccount());
    renderFlow();

    await completePersonal(user);
    await user.type(await screen.findByRole('textbox', { name: 'License number' }), 'LIC-77');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    // Back on step 1: what was entered is still there.
    expect(await screen.findByRole('textbox', { name: 'Address' })).toHaveValue('12 Tahrir Street, Cairo');
    // Step 2 isn't "completed" yet, so the stepper can't jump to it -- Continue does.
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('textbox', { name: 'License number' })).toHaveValue('LIC-77');
    // Completed steps are buttons.
    await user.click(screen.getByRole('button', { name: /Personal Info/ }));
    expect(await screen.findByRole('textbox', { name: 'Address' })).toHaveValue('12 Tahrir Street, Cairo');
  }, 30000);

  it('shows "Independent practice" once in the hospital list even when the data repeats it', async () => {
    const user = userEvent.setup();
    server.use(
      noProfile(),
      blankAccount(),
      http.get(`${base()}/hospitals`, () =>
        HttpResponse.json({
          data: [
            { id: 'h-1', name: 'Cairo International Hospital', address: 'Cairo', createdAt: now(), updatedAt: now() },
            { id: 'h-1', name: 'Cairo International Hospital', address: 'Cairo', createdAt: now(), updatedAt: now() },
            { id: 'h-ip', name: 'Independent Practice', address: '', createdAt: now(), updatedAt: now() },
          ],
        }),
      ),
    );
    renderFlow();
    await completePersonal(user);
    await user.click(await screen.findByRole('combobox', { name: /Hospital/ }));
    expect(await screen.findAllByRole('option', { name: /Independent practice/i })).toHaveLength(1);
    expect(screen.getAllByRole('option', { name: 'Cairo International Hospital' })).toHaveLength(1);
  }, 30000);

  it('resumes at Documents for a draft profile, warns about the same file used twice, and guards Submit against a double click', async () => {
    const user = userEvent.setup();
    let submits = 0;
    server.use(
      http.get(`${base()}/doctors/:id/verifications`, () => HttpResponse.json({ data: [] })),
      http.post(`${base()}/doctors/:id/verifications`, async () => {
        submits += 1;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({ data: { id: 'case-new', doctorId: 'doctor-profile-1', status: 'submitted', submittedAt: now(), decidedAt: null } }, { status: 201 });
      }),
    );
    const { container } = renderFlow();

    expect(await screen.findByText('Upload 7 documents')).toBeInTheDocument();
    const inputs = () => [...container.querySelectorAll<HTMLInputElement>('input[type="file"]:not([capture])')];
    const file = (name: string) => new File(['%PDF-1.4 test'], name, { type: 'application/pdf' });

    await user.upload(inputs()[0]!, file('id-front.pdf'));
    expect(await screen.findByText('1 of 7 uploaded')).toBeInTheDocument();
    // The same file for the next slot: a warning first, nothing uploaded until confirmed.
    await user.upload(inputs()[1]!, file('id-front.pdf'));
    expect(await screen.findByText('This looks like the same file you used for National ID (front). Upload the correct document.')).toBeInTheDocument();
    expect(screen.getByText('1 of 7 uploaded')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Choose another file' }));

    const names = ['id-back.pdf', 'selfie.pdf', 'license.pdf', 'graduation.pdf', 'board.pdf', 'membership.pdf'];
    for (const [index, name] of names.entries()) {
      await user.upload(inputs()[index + 1]!, file(name));
      expect(await screen.findByText(`${index + 2} of 7 uploaded`)).toBeInTheDocument();
    }
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // Review: every section with Edit, and the documents.
    expect(await screen.findByRole('heading', { name: 'About you' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'License' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Practice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit License' })).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Submit for verification' });
    await user.dblClick(submit);
    await waitFor(() => expect(submits).toBe(1));
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(submits).toBe(1);
  }, 45000);

  it('replaces the form with the status screen while a case is under review', async () => {
    server.use(verifications('under_review'));
    renderFlow();

    expect(await screen.findByRole('heading', { name: 'Application received' })).toBeInTheDocument();
    expect(screen.getByText('Under review')).toBeInTheDocument();
    expect(screen.getByText('Our team reviews your license and documents.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute('href', '/en/patient');
    expect(screen.queryByText('Upload 7 documents')).not.toBeInTheDocument();
    // The header names the application's state, not a specialty.
    expect(screen.getByText('Doctor application · Under review')).toBeInTheDocument();
  });

  it('shows the MoreInfoNeeded status with its own copy, distinct from Rejected', async () => {
    server.use(verifications('more_info_needed', 'Please upload a clearer photo of your medical license.'));
    renderFlow();

    expect(await screen.findByText('More info needed')).toBeInTheDocument();
    expect(screen.getByText('We need one more thing from you before we can continue reviewing your application.')).toBeInTheDocument();
    expect(screen.queryByText('You can edit your profile and documents, then resubmit for review.')).not.toBeInTheDocument();
  });

  it('shows the rejection reason; edit-and-resubmit reopens the form with the license number locked and never sends it on the PATCH', async () => {
    const user = userEvent.setup();
    let patchBody: Record<string, unknown> | undefined;
    server.use(
      verifications('rejected', 'The submitted license number could not be verified.'),
      http.patch(`${base()}/doctors/me`, async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: { id: 'doctor-profile-1' } });
      }),
    );
    renderFlow();

    expect(await screen.findByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('The submitted license number could not be verified.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit and resubmit' }));

    const license = await screen.findByRole('textbox', { name: 'License number' });
    expect(license).toHaveAttribute('readonly');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(patchBody).toBeDefined());
    expect(patchBody).not.toHaveProperty('licenseNumber');
  }, 30000);

  it('shows an approved message with a link to the Doctor Portal', async () => {
    server.use(verifications('approved'));
    renderFlow();

    expect(await screen.findByText('Approved')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Doctor Portal' })).toHaveAttribute('href', '/en/doctor');
  });
});
