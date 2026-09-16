import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { MessagingWorkspace } from '@/features/messaging/components/messaging-workspace';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import { endSession, findAccountById, LEGACY_DOCTOR_ACCOUNT_ID, LEGACY_PATIENT_ACCOUNT_ID, startSession } from '@/mocks/auth-store';
import { resetDoctorStore } from '@/mocks/doctor-store';
import { resetMessagingStore, startOrGetThread } from '@/mocks/messaging-store';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../messages/en.json';

// Connection-state indicator (Messages Page Overhaul, Phase 2 audit
// finding): controls `useRealtimeConnectionState`'s return value directly
// rather than driving a real/fake socket end-to-end (that's
// use-realtime-socket.test.tsx's job) -- this test only needs to know
// MessagingWorkspace renders the right thing for each connection state.
const connectionState = { isConnected: true };
vi.mock('@/shared/lib/realtime/use-realtime-socket', () => ({
  useRealtimeConnectionState: () => connectionState.isConnected,
  // A selected thread mounts ThreadPanel, which reads the shared socket
  // for the typing indicator -- undefined here mirrors "no live socket in
  // the test environment" exactly like `use-realtime-socket.ts`'s own
  // real guard against opening one under Vitest.
  getRealtimeSocket: () => undefined,
}));

// `?thread=` URL state (Phase 3): mirrors the doctor patient-chart page's
// own `?tab=` test setup exactly -- a mutable search-params object so a
// test can simulate a deep-link, plus a spy on `replace` to assert what a
// thread selection writes into the URL.
let currentSearchParams = new URLSearchParams();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/messages',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => currentSearchParams,
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  currentSearchParams = new URLSearchParams();
  // The mock messaging handlers resolve "who is calling" via
  // `resolveRequestAccountId` (bearer token, then the mock session marker)
  // -- unlike doctor-store.ts's own endpoints, they have no role-specific
  // fallback, so without a real mock session established here every call
  // would silently resolve as the generic legacy-patient fallback
  // regardless of this component's own `role="doctor"` prop. Logging in as
  // the doctor account keeps every mock endpoint (candidates AND threads)
  // agreeing on the same caller, exactly like a real JWT would.
  startSession(findAccountById(LEGACY_DOCTOR_ACCOUNT_ID)!);
});
afterEach(() => {
  server.resetHandlers();
  resetDoctorStore();
  resetMessagingStore();
  connectionState.isConnected = true;
  replace.mockClear();
  endSession();
});
afterAll(() => server.close());

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: LEGACY_DOCTOR_ACCOUNT_ID, email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

function renderWorkspace() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={doctorState}>
          <MessagingWorkspace role="doctor" />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('MessagingWorkspace connection-state indicator', () => {
  it('shows no "Reconnecting" text while the realtime socket is connected', async () => {
    connectionState.isConnected = true;
    renderWorkspace();

    await screen.findByRole('button', { name: 'New message' });
    expect(screen.queryByText('Reconnecting…')).not.toBeInTheDocument();
  });

  it('shows a subtle "Reconnecting" indicator when the realtime socket is disconnected', async () => {
    connectionState.isConnected = false;
    renderWorkspace();

    expect(await screen.findByText('Reconnecting…')).toBeInTheDocument();
  });
});

describe('MessagingWorkspace merged inbox', () => {
  it('renders a single sr-only H2 above the merged thread list, with no separate "Start a conversation" card', async () => {
    renderWorkspace();

    await screen.findByRole('button', { name: 'New message' });
    expect(screen.getByRole('heading', { level: 2, name: 'Conversations' })).toBeInTheDocument();
    // The old permanent "Start a conversation" card title is gone -- it
    // only exists inside the New Message dialog now (closed by default).
    expect(screen.queryByText('Start a conversation')).not.toBeInTheDocument();
  });

  it('lists existing threads with the counterparty name and no appointment label', async () => {
    startOrGetThread(LEGACY_PATIENT_ACCOUNT_ID, LEGACY_DOCTOR_ACCOUNT_ID);
    renderWorkspace();

    expect(await screen.findByText('Amina Youssef')).toBeInTheDocument();
    expect(screen.queryByText(/^Appointment /)).not.toBeInTheDocument();
  });

  it('filters the visible threads by counterparty name via the search input', async () => {
    startOrGetThread(LEGACY_PATIENT_ACCOUNT_ID, LEGACY_DOCTOR_ACCOUNT_ID);
    startOrGetThread('user-locked-1', LEGACY_DOCTOR_ACCOUNT_ID);
    renderWorkspace();

    await screen.findByText('Amina Youssef');
    expect(screen.getByText('Locked Account')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Search conversations'), 'amina');

    expect(screen.getByText('Amina Youssef')).toBeInTheDocument();
    expect(screen.queryByText('Locked Account')).not.toBeInTheDocument();
  });

  it('shows an honest "no matches" message when the search filters out every thread', async () => {
    startOrGetThread(LEGACY_PATIENT_ACCOUNT_ID, LEGACY_DOCTOR_ACCOUNT_ID);
    renderWorkspace();

    await screen.findByText('Amina Youssef');
    await userEvent.type(screen.getByPlaceholderText('Search conversations'), 'nobody matches this');

    expect(await screen.findByText('No conversations match your search.')).toBeInTheDocument();
    expect(screen.queryByText('Amina Youssef')).not.toBeInTheDocument();
  });
});

describe('MessagingWorkspace new-message dialog', () => {
  it('dedupes a counterparty with multiple appointments into a single candidate row', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/appointments/doctor/upcoming-work`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'appointment-a',
              patientId: 'patient-duplicate',
              scheduledAt: new Date(Date.now() - 60_000).toISOString(),
              title: 'Yasmin Adel',
              status: 'completed',
            },
            {
              id: 'appointment-b',
              patientId: 'patient-duplicate',
              scheduledAt: new Date().toISOString(),
              title: 'Yasmin Adel',
              status: 'upcoming',
            },
          ],
        }),
      ),
    );
    renderWorkspace();

    await userEvent.click(await screen.findByRole('button', { name: 'New message' }));

    const rows = await screen.findAllByText('Yasmin Adel');
    expect(rows).toHaveLength(1);
  });

  it('resolves the counterparty-profile-id gap: starting a conversation keys off the real patient profile id, not an appointment id', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/appointments/doctor/upcoming-work`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'appointment-only-1',
              patientId: 'patient-real-profile-id',
              scheduledAt: new Date().toISOString(),
              title: 'Karim Fathy',
              status: 'upcoming',
            },
          ],
        }),
      ),
    );
    let capturedCounterpartyProfileId: string | undefined;
    server.use(
      http.post(`${env.apiBaseUrl}/message-threads`, async ({ request }) => {
        const body = (await request.json()) as { counterpartyProfileId: string };
        capturedCounterpartyProfileId = body.counterpartyProfileId;
        return HttpResponse.json(
          {
            data: {
              id: 'thread-new',
              patientId: body.counterpartyProfileId,
              doctorId: LEGACY_DOCTOR_ACCOUNT_ID,
              createdAt: new Date().toISOString(),
              lastMessageAt: new Date().toISOString(),
              counterpartyDisplayName: 'Karim Fathy',
            },
          },
          { status: 201 },
        );
      }),
    );

    renderWorkspace();
    await userEvent.click(await screen.findByRole('button', { name: 'New message' }));
    await screen.findByText('Karim Fathy');
    const messageButton = screen.getByRole('button', { name: 'Message' });
    console.log('DEBUG button found', messageButton.outerHTML);
    await userEvent.click(messageButton);
    console.log('DEBUG after click, captured =', capturedCounterpartyProfileId);

    await waitFor(() => expect(capturedCounterpartyProfileId).toBe('patient-real-profile-id'));
    // Never the appointment id -- that would be the pre-Phase-3 bug this closes.
    expect(capturedCounterpartyProfileId).not.toBe('appointment-only-1');
  });

  it('closes the dialog and selects the resulting thread after starting a conversation', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/appointments/doctor/upcoming-work`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'appointment-only-1',
              patientId: 'patient-real-profile-id',
              scheduledAt: new Date().toISOString(),
              title: 'Karim Fathy',
              status: 'upcoming',
            },
          ],
        }),
      ),
    );
    renderWorkspace();

    await userEvent.click(await screen.findByRole('button', { name: 'New message' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Message' }));

    await waitFor(() => expect(screen.queryByText('Start a conversation')).not.toBeInTheDocument());
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(String(replace.mock.calls.at(-1)?.[0])).toContain('thread=');
  });
});

describe('MessagingWorkspace ?thread= URL state', () => {
  it('deep-links straight to the thread named in the URL', async () => {
    const thread = startOrGetThread(LEGACY_PATIENT_ACCOUNT_ID, LEGACY_DOCTOR_ACCOUNT_ID);
    currentSearchParams = new URLSearchParams({ thread: thread.id });

    renderWorkspace();

    expect(await screen.findByText('Send the first message below.')).toBeInTheDocument();
  });

  it('writes the selected thread id into the URL via replace (not push)', async () => {
    startOrGetThread(LEGACY_PATIENT_ACCOUNT_ID, LEGACY_DOCTOR_ACCOUNT_ID);
    renderWorkspace();

    await userEvent.click(await screen.findByText('Amina Youssef'));

    expect(replace).toHaveBeenCalled();
    expect(String(replace.mock.calls.at(-1)?.[0])).toContain('thread=');
  });
});
