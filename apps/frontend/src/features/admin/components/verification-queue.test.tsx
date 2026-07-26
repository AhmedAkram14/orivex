import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { VerificationQueue } from './verification-queue';
import { resetDoctorStore, submitVerification } from '@/mocks/doctor-store';
import { resetPatientStore, submitMyVerification, setPatientVerified } from '@/mocks/patient-store';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import enMessages from '../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/admin/verification-queue',
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

function renderQueue() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <VerificationQueue />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('VerificationQueue', () => {
  it('shows the empty state when nothing is pending review', async () => {
    renderQueue();

    expect(await screen.findByText('Nothing pending')).toBeInTheDocument();
  });

  it('shows a real pending submission from the doctor flow, with real resolved applicant identity', async () => {
    submitVerification('doctor-profile-1', {
      licenseNumber: 'LIC-9001',
      specialtyCode: 'cardiology',
      documentAssetIds: ['seed-national-id-front'],
    });

    renderQueue();

    expect(await screen.findByText('Dr. Sarah Ahmed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View case' })).toBeInTheDocument();
  });

  it('filters server-side by subject type -- asserts the real querystring sent, not a client-side filter', async () => {
    submitVerification('doctor-profile-1', {
      licenseNumber: 'LIC-9001',
      specialtyCode: 'cardiology',
      documentAssetIds: ['seed-national-id-front'],
    });
    setPatientVerified(false);
    submitMyVerification({ documentAssetIds: ['seed-national-id-front', 'seed-national-id-back', 'seed-selfie-with-id'] });

    const requestedUrls: string[] = [];
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/admin/verification-queue')) requestedUrls.push(request.url);
    });

    renderQueue();
    await screen.findByText('Dr. Sarah Ahmed');
    expect(screen.getByText('Amina Youssef')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('combobox', { name: 'Filter by type' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Doctor' }));

    await waitFor(() => {
      expect(requestedUrls.some((url) => url.includes('subjectType=doctor'))).toBe(true);
    });
    await waitFor(() => {
      expect(screen.queryByText('Amina Youssef')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Dr. Sarah Ahmed')).toBeInTheDocument();
  });

  it('shows a load error when the queue request fails', async () => {
    server.use(
      http.get(`${base()}/admin/verification-queue`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom', requestId: 'r', timestamp: new Date().toISOString() } },
          { status: 500 },
        ),
      ),
    );

    renderQueue();

    expect(await screen.findByText('Could not load the verification queue.')).toBeInTheDocument();
  });
});
