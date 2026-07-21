import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { OnboardingFlow } from './onboarding-flow';
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
afterEach(() => server.resetHandlers());
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
  it('shows the profile step (Draft) when no doctor profile exists yet', async () => {
    server.use(
      http.get(`${base()}/doctors/me`, () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'not found', requestId: 'r', timestamp: new Date().toISOString() } },
          { status: 404 },
        ),
      ),
    );

    renderFlow();

    expect(await screen.findByLabelText('License number')).toBeInTheDocument();
  });

  it('resumes at the documents step (Draft) when a profile exists but nothing has been submitted', async () => {
    server.use(
      http.get(`${base()}/doctors/:id/verifications`, () => HttpResponse.json({ data: [] })),
    );

    renderFlow();

    expect(await screen.findByText('Upload a document')).toBeInTheDocument();
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
    expect(screen.queryByText('Upload a document')).not.toBeInTheDocument();
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
