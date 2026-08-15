import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { VerificationCaseDetail } from './verification-case-detail';
import { resetDoctorStore, submitVerification } from '@/mocks/doctor-store';
import { resetPatientStore } from '@/mocks/patient-store';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import enMessages from '../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/admin/verification-queue/case-1',
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
  resetDoctorStore();
  resetPatientStore();
});
afterAll(() => server.close());

function renderDetail(verificationCaseId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <VerificationCaseDetail verificationCaseId={verificationCaseId} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

// The seeded, already-Approved patient case id from `patient-store.ts`'s own `seedVerifications()`.
const SEEDED_PATIENT_CASE_ID = 'verification-1';

describe('VerificationCaseDetail', () => {
  it('shows the not-found state for an unknown case id', async () => {
    renderDetail('does-not-exist');

    expect(await screen.findByText('This verification case could not be found.')).toBeInTheDocument();
  });

  it('renders Applicant, Verification Information, Documents, and History for the seeded patient case (least-privilege: no medical fields)', async () => {
    renderDetail(SEEDED_PATIENT_CASE_ID);

    expect(await screen.findByText('Amina Youssef')).toBeInTheDocument();
    expect(screen.getByText('patient@orivex.dev')).toBeInTheDocument();
    expect(screen.getByText('Patient identity verification')).toBeInTheDocument();
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0);

    // Least-privilege: no clinical/medical fields (allergies, chronic
    // diseases) ever render on the patient verification case, even though
    // the seeded PatientProfile mock has them.
    expect(screen.queryByText('Penicillin')).not.toBeInTheDocument();

    // Documents: the seeded case's 3 real document ids resolve through the
    // real owner-or-admin GET /media-assets/:id, not invented placeholders.
    expect(await screen.findByText('National ID (front)')).toBeInTheDocument();
    expect(screen.getByText('National ID (back)')).toBeInTheDocument();
    expect(screen.getByText('Selfie with ID')).toBeInTheDocument();

    // History: reviewer-identity limitation is disclosed, never fabricated.
    expect(screen.getByText(/which admin made each decision isn't recorded yet/)).toBeInTheDocument();

    // Approved -> no decide actions, but Suspend is available.
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suspend' })).toBeInTheDocument();
  });

  it('renders Professional Information for a doctor case and lets an admin approve it', async () => {
    const submitted = submitVerification('doctor-profile-1', {
      licenseNumber: 'LIC-9001',
      specialtyCode: 'cardiology',
      documentAssetIds: ['seed-national-id-front'],
    });

    renderDetail(submitted.id);

    expect(await screen.findByText('Dr. Sarah Ahmed')).toBeInTheDocument();
    expect(screen.getByText('Doctor verification')).toBeInTheDocument();
    expect(screen.getByText('LIC-9001')).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('Professional rank')).toBeInTheDocument();
    expect(screen.getByText('Consultant')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    // Approve now opens a confirmation dialog before firing the mutation.
    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));

    await screen.findAllByText('Approved');
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    // Approved -> Suspend becomes the only available action.
    expect(await screen.findByRole('button', { name: 'Suspend' })).toBeInTheDocument();
  });

  it('requires a non-empty reason before confirming a Reject decision', async () => {
    const submitted = submitVerification('doctor-profile-1', {
      licenseNumber: 'LIC-9002',
      specialtyCode: 'cardiology',
      documentAssetIds: ['seed-national-id-front'],
    });

    renderDetail(submitted.id);

    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    expect(await screen.findByText('Reject this application?')).toBeInTheDocument();

    // Two "Reject" buttons exist once the dialog opens (the trigger and the
    // dialog's own confirm button) -- the confirm button is the last one.
    const rejectButtons = screen.getAllByRole('button', { name: 'Reject' });
    const confirm = rejectButtons[rejectButtons.length - 1];
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Reason'), 'Illegible ID document.');
    expect(confirm).toBeEnabled();

    await userEvent.click(confirm);

    await screen.findAllByText('Rejected');
    expect(screen.getAllByText('Illegible ID document.').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('shows the FULL subject-level lifecycle in History after a resubmission -- the prior Rejected case is not lost, and the admin can see it from the UI, not just the database', async () => {
    // First submission, rejected.
    const first = submitVerification('doctor-profile-1', {
      licenseNumber: 'LIC-9004',
      specialtyCode: 'cardiology',
      documentAssetIds: ['seed-national-id-front'],
    });
    const firstRender = renderDetail(first.id);
    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    const rejectButtons = screen.getAllByRole('button', { name: 'Reject' });
    await userEvent.type(screen.getByLabelText('Reason'), 'Illegible license photo.');
    await userEvent.click(rejectButtons[rejectButtons.length - 1]);
    await screen.findAllByText('Rejected');
    firstRender.unmount();

    // Resubmission always creates a brand new VerificationCase row (never
    // mutates the old one) -- matches the real backend's own contract.
    const second = submitVerification('doctor-profile-1', {
      licenseNumber: 'LIC-9004',
      specialtyCode: 'cardiology',
      documentAssetIds: ['seed-national-id-front'],
    });
    expect(second.id).not.toBe(first.id);

    // Open the NEW case's detail page (the first tree is unmounted, so this
    // is the only tree in the document) -- the History section must still
    // surface the prior Rejected case, proving the admin can inspect the
    // complete lifecycle from the UI itself, not merely infer it from
    // unreachable database rows.
    renderDetail(second.id);
    await screen.findByText('Illegible license photo.');
    expect(await screen.findAllByText('Rejected')).not.toHaveLength(0);
    expect(await screen.findAllByText('Submitted')).not.toHaveLength(0);
  });

  it('shows a load error if the case-detail request fails', async () => {
    server.use(
      http.get(`${base()}/admin/verification-queue/:id`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom', requestId: 'r', timestamp: new Date().toISOString() } },
          { status: 500 },
        ),
      ),
    );

    renderDetail('case-1');

    expect(await screen.findByText('This verification case could not be found.')).toBeInTheDocument();
  });
});
