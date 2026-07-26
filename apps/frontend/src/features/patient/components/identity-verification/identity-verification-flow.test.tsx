import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { IdentityVerificationFlow } from './identity-verification-flow';
import { resetPatientStore, setPatientVerified } from '@/mocks/patient-store';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import enMessages from '../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/patient/verify-identity',
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
  resetPatientStore();
});
afterAll(() => server.close());

function renderFlow(returnTo?: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <IdentityVerificationFlow returnTo={returnTo} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

async function uploadAllDocuments() {
  const fileNames = ['id-front.jpg', 'id-back.jpg', 'selfie.jpg'];
  for (let index = 0; index < fileNames.length; index += 1) {
    const fileName = fileNames[index];
    const file = new File(['content'], fileName, { type: 'image/jpeg' });
    const inputs = document.querySelectorAll('input[type="file"]');
    await userEvent.upload(inputs[index] as HTMLInputElement, file);
    await screen.findByText(fileName, undefined, { timeout: 3000 });
  }
}

describe('IdentityVerificationFlow', () => {
  // The seeded `patient@orivex.dev` demo account is already Approved by
  // default (matching `doctor-store.ts`'s own precedent), so the flow should
  // show the Approved status screen without ever rendering the wizard.
  it('shows the Approved status for the already-verified seeded account', async () => {
    renderFlow();

    expect(await screen.findByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Your identity has been verified.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to My Health' })).toHaveAttribute('href', '/en/patient');
  });

  it('offers a "Continue" link back to returnTo when already Approved and returnTo is set', async () => {
    renderFlow('/patient/records');

    expect(await screen.findByText('Approved')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/en/patient/records');
  });

  it('walks Documents -> Review -> Submit for a never-verified account, then shows Submitted', async () => {
    setPatientVerified(false);
    renderFlow();

    expect(await screen.findByText('National ID (front)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

    await uploadAllDocuments();

    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('3 documents')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Submit for verification' }));

    expect(await screen.findByText('Submitted')).toBeInTheDocument();
    expect(
      screen.getByText('Your identity verification is being reviewed. This usually only takes a short while.'),
    ).toBeInTheDocument();
  }, 15000);

  it('shows the rejection reason and lets the applicant edit and resubmit', async () => {
    server.use(
      http.get(`${base()}/patients/:id/verifications`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'case-1',
              subjectAccountId: 'user-patient-1',
              subjectType: 'patient',
              status: 'rejected',
              reason: 'The submitted National ID photo was unreadable.',
              submittedAt: new Date().toISOString(),
              decidedAt: new Date().toISOString(),
            },
          ],
        }),
      ),
    );

    renderFlow();

    expect(await screen.findByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('The submitted National ID photo was unreadable.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Edit and resubmit' }));

    expect(await screen.findByText('National ID (front)')).toBeInTheDocument();
  });
});
