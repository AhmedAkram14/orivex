import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import VerifyPrescriptionPage from './page';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import enMessages from '../../../../../messages/en.json';

const base = () => env.apiBaseUrl;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/verify-prescription/TEST-CODE',
  useParams: () => ({ locale: 'en', code: 'TEST-CODE' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <VerifyPrescriptionPage />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('VerifyPrescriptionPage', () => {
  it('shows doctor/patient identity and the real medication list for a valid code', async () => {
    server.use(
      http.get(`${base()}/prescriptions/verify/:code`, () =>
        HttpResponse.json({
          data: {
            valid: true,
            doctorName: 'Dr. Sarah Ahmed',
            doctorLicenseNumber: 'LIC-1000',
            patientName: 'Amina Youssef',
            signedAt: '2026-08-20T14:10:00.000Z',
            lineItems: [{ drugName: 'Amoxicillin', dosage: '500mg', frequency: 'Twice daily', durationDays: 7 }],
          },
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText('Valid, signed prescription')).toBeInTheDocument();
    expect(screen.getByText('Dr. Sarah Ahmed')).toBeInTheDocument();
    expect(screen.getByText('LIC-1000')).toBeInTheDocument();
    expect(screen.getByText('Amina Youssef')).toBeInTheDocument();
    expect(screen.getByText('Amoxicillin')).toBeInTheDocument();
  });

  it('shows an honest not-valid state for an unknown code', async () => {
    server.use(
      http.get(`${base()}/prescriptions/verify/:code`, () => HttpResponse.json({ data: { valid: false } })),
    );

    renderPage();

    expect(await screen.findByText('Not a valid prescription')).toBeInTheDocument();
  });
});
