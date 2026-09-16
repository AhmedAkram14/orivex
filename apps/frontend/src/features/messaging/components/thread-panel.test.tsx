import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ThreadPanel } from '@/features/messaging/components/thread-panel';
import { server } from '@/mocks/server';
import { LEGACY_DOCTOR_ACCOUNT_ID, LEGACY_PATIENT_ACCOUNT_ID } from '@/mocks/auth-store';
import { resetMessagingStore, seedThreadAppointments, startOrGetThread } from '@/mocks/messaging-store';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../messages/en.json';

// Typing indicator (Messages Page Overhaul, Phase 2): ThreadPanel listens
// on the ONE shared socket via `getRealtimeSocket()` rather than opening
// its own connection -- this fake stands in for that shared socket exactly
// the way use-realtime-socket.test.tsx's fake does for the hook that owns
// it, letting the test fire a `messaging.typing` event directly.
const registeredHandlers = new Map<string, (payload?: unknown) => void>();
const fakeSocket = {
  on: vi.fn((event: string, handler: (payload?: unknown) => void) => registeredHandlers.set(event, handler)),
  off: vi.fn(),
};

vi.mock('@/shared/lib/realtime/use-realtime-socket', () => ({
  getRealtimeSocket: () => fakeSocket,
}));

// Thread header context (Phase 5): the doctor-only patient-chart link is a
// real <Link>, which routes through next-intl's navigation wrapper -- that
// calls straight through to next/navigation's hooks, which throw outside a
// real Next.js App Router tree (same precedent as user-menu.test.tsx).
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
afterEach(() => {
  server.resetHandlers();
  resetMessagingStore();
  registeredHandlers.clear();
});
afterAll(() => server.close());

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: LEGACY_DOCTOR_ACCOUNT_ID, email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

function renderThreadPanel(threadId: string, overrides: { role?: 'patient' | 'doctor'; patientId?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={doctorState}>
          <ThreadPanel
            threadId={threadId}
            counterpartyName="Ahmed Ali"
            counterpartyAccountId={LEGACY_PATIENT_ACCOUNT_ID}
            role={overrides.role ?? 'doctor'}
            patientId={overrides.patientId ?? LEGACY_PATIENT_ACCOUNT_ID}
          />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('ThreadPanel typing indicator', () => {
  it('shows "Typing…" only for a messaging.typing event scoped to this thread, and clears after silence', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const thread = startOrGetThread(LEGACY_PATIENT_ACCOUNT_ID, LEGACY_DOCTOR_ACCOUNT_ID);
    renderThreadPanel(thread.id);

    await waitFor(() => expect(registeredHandlers.has('messaging.typing')).toBe(true));
    expect(screen.queryByText('Typing…')).not.toBeInTheDocument();

    // An event for a DIFFERENT thread must never show here.
    act(() => registeredHandlers.get('messaging.typing')?.({ threadId: 'some-other-thread', fromAccountId: LEGACY_PATIENT_ACCOUNT_ID }));
    expect(screen.queryByText('Typing…')).not.toBeInTheDocument();

    act(() => registeredHandlers.get('messaging.typing')?.({ threadId: thread.id, fromAccountId: LEGACY_PATIENT_ACCOUNT_ID }));
    expect(screen.getByText('Typing…')).toBeInTheDocument();

    // Clears itself after ~5s of silence.
    act(() => {
      vi.advanceTimersByTime(5001);
    });
    expect(screen.queryByText('Typing…')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});

describe('ThreadPanel disclaimer de-duplication (Phase 5)', () => {
  it('never renders the old permanent adminNotice line, in either role', async () => {
    const thread = startOrGetThread(LEGACY_PATIENT_ACCOUNT_ID, LEGACY_DOCTOR_ACCOUNT_ID);
    renderThreadPanel(thread.id, { role: 'doctor' });
    await waitFor(() => expect(screen.getByPlaceholderText('Write a message…')).toBeInTheDocument());
    expect(screen.queryByText(/contact your clinic directly/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/For follow-up and administrative questions only/i)).not.toBeInTheDocument();
  });
});

describe('ThreadPanel patient-chart link (Phase 5)', () => {
  it('shows a link to the patient chart for the doctor role, using thread.patientId', async () => {
    const thread = startOrGetThread(LEGACY_PATIENT_ACCOUNT_ID, LEGACY_DOCTOR_ACCOUNT_ID);
    renderThreadPanel(thread.id, { role: 'doctor', patientId: 'patient-real-profile-id' });

    const link = await screen.findByRole('link', { name: 'View patient chart' });
    expect(link).toHaveAttribute('href', '/en/doctor/patients/patient-real-profile-id');
  });

  it('never shows the patient-chart link for the patient role', async () => {
    const thread = startOrGetThread(LEGACY_PATIENT_ACCOUNT_ID, LEGACY_DOCTOR_ACCOUNT_ID);
    renderThreadPanel(thread.id, { role: 'patient', patientId: 'patient-real-profile-id' });
    await waitFor(() => expect(screen.getByPlaceholderText('Write a message…')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: 'View patient chart' })).not.toBeInTheDocument();
  });
});

describe('ThreadPanel "Last appointment" line (Phase 5)', () => {
  it('shows the most recent appointment by scheduledAt, for either role, including a real Expired status', async () => {
    const thread = startOrGetThread(LEGACY_PATIENT_ACCOUNT_ID, LEGACY_DOCTOR_ACCOUNT_ID);
    seedThreadAppointments(thread.id, [
      { id: 'appt-older', scheduledAt: '2026-01-01T10:00:00.000Z', status: 'completed' },
      { id: 'appt-newer', scheduledAt: '2026-03-05T10:00:00.000Z', status: 'expired' },
    ]);
    renderThreadPanel(thread.id, { role: 'patient' });

    expect(await screen.findByText(/Last appointment:/)).toBeInTheDocument();
    expect(screen.getByText(/Expired/)).toBeInTheDocument();
    // The older, non-most-recent appointment's own status must not be the one shown.
    expect(screen.queryByText(/Completed/)).not.toBeInTheDocument();
  });

  it('shows nothing when the pair has no appointments on record', async () => {
    const thread = startOrGetThread(LEGACY_PATIENT_ACCOUNT_ID, LEGACY_DOCTOR_ACCOUNT_ID);
    renderThreadPanel(thread.id, { role: 'doctor' });
    await waitFor(() => expect(screen.getByPlaceholderText('Write a message…')).toBeInTheDocument());
    expect(screen.queryByText(/Last appointment:/)).not.toBeInTheDocument();
  });
});
