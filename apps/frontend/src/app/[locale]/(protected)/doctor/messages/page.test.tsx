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

// `?thread=` URL state (Phase 3): `replace` writes back into the same
// mutable `currentSearchParams` `useSearchParams` reads, mirroring a real
// Next.js router closely enough that selecting a thread is actually
// reflected on the next render, not just asserted via a `replace` spy.
let currentSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn((url: string) => {
      currentSearchParams = new URLSearchParams(url.split('?')[1] ?? '');
    }),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/doctor/messages',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => currentSearchParams,
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
  currentSearchParams = new URLSearchParams();
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
  // Merged-inbox redesign (Phase 3): candidates now live inside the "New
  // message" dialog, not a permanent "Start a conversation" card.
  it('lets a doctor start a conversation from their upcoming work list', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'New message' }));
    expect(await screen.findByText('Start a conversation')).toBeInTheDocument();
    const messageButtons = screen.getAllByRole('button', { name: 'Message' });
    expect(messageButtons.length).toBeGreaterThan(0);

    await user.click(messageButtons[0]!);

    expect(await screen.findByText('No messages yet')).toBeInTheDocument();
  });
});
