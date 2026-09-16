import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { MessagingWorkspace } from '@/features/messaging/components/messaging-workspace';
import { server } from '@/mocks/server';
import { LEGACY_DOCTOR_ACCOUNT_ID } from '@/mocks/auth-store';
import { resetDoctorStore } from '@/mocks/doctor-store';
import { resetMessagingStore } from '@/mocks/messaging-store';
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
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetDoctorStore();
  resetMessagingStore();
  connectionState.isConnected = true;
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

    await screen.findByText('Conversations');
    expect(screen.queryByText('Reconnecting…')).not.toBeInTheDocument();
  });

  it('shows a subtle "Reconnecting" indicator when the realtime socket is disconnected', async () => {
    connectionState.isConnected = false;
    renderWorkspace();

    expect(await screen.findByText('Reconnecting…')).toBeInTheDocument();
  });
});
