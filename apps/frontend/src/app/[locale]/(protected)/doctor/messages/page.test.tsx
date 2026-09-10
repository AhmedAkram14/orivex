import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import DoctorMessagesPage from './page';
import { server } from '@/mocks/server';
import { LEGACY_DOCTOR_ACCOUNT_ID } from '@/mocks/auth-store';
import { resetDoctorStore } from '@/mocks/doctor-store';
import { resetMessagingStore } from '@/mocks/messaging-store';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/messages',
  useParams: () => ({ locale: 'en' }),
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
  user: { id: LEGACY_DOCTOR_ACCOUNT_ID, email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

afterEach(() => {
  resetDoctorStore();
  resetMessagingStore();
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={doctorState}>
          <DoctorMessagesPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('DoctorMessagesPage', () => {
  it('lets a doctor start a conversation from their upcoming work list', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Start a conversation')).toBeInTheDocument();
    const messageButtons = screen.getAllByRole('button', { name: 'Message' });
    expect(messageButtons.length).toBeGreaterThan(0);

    await user.click(messageButtons[0]!);

    expect(await screen.findByText('No messages yet')).toBeInTheDocument();
  });
});
