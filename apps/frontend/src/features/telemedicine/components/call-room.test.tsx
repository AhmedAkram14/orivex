import { screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import { TELEMEDICINE_PATHS } from '@/features/telemedicine/api/paths';

import { CallRoom } from './call-room';

// LiveKit's real components attempt a genuine media/WebSocket connection
// on mount (`connect` prop) -- neither exists in jsdom. This test verifies
// CallRoom's own wiring (loading/error states, and that a successful token
// fetch hands the right props to LiveKitRoom), not LiveKit's own runtime
// behavior, matching this codebase's existing precedent of not deep-testing
// third-party SDKs it can't safely run in jsdom (pay-now-form.test.tsx only
// covers the not-configured state for the same reason with Stripe).
vi.mock('@livekit/components-react', () => ({
  LiveKitRoom: ({ token, serverUrl }: { token: string; serverUrl: string }) => (
    <div data-testid="livekit-room" data-token={token} data-server-url={serverUrl} />
  ),
  VideoConference: () => null,
  RoomAudioRenderer: () => null,
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('CallRoom', () => {
  it('shows a connecting state while the room token is being minted', () => {
    server.use(
      http.post(`${env.apiBaseUrl}${TELEMEDICINE_PATHS.roomToken('session-1')}`, async () => {
        await new Promise(() => {
          // never resolves -- asserts the loading state specifically
        });
      }),
    );

    renderWithProviders(<CallRoom consultationSessionId="session-1" />);

    expect(screen.getByText('Connecting to the call…')).toBeInTheDocument();
  });

  it('shows an error alert when the room token could not be minted', async () => {
    server.use(
      http.post(`${env.apiBaseUrl}${TELEMEDICINE_PATHS.roomToken('session-2')}`, () =>
        HttpResponse.json(
          { error: { code: 'VALIDATION_FAILED', message: 'not configured', requestId: 'mock', timestamp: new Date().toISOString() } },
          { status: 422 },
        ),
      ),
    );

    renderWithProviders(<CallRoom consultationSessionId="session-2" />);

    expect(await screen.findByText('Could not start the video call. Please try again.')).toBeInTheDocument();
  });

  it('hands the minted token and server url to LiveKitRoom on success', async () => {
    server.use(
      http.post(`${env.apiBaseUrl}${TELEMEDICINE_PATHS.roomToken('session-3')}`, () =>
        HttpResponse.json({ data: { token: 'real-jwt-token', url: 'wss://orivex-test.livekit.cloud' } }),
      ),
    );

    renderWithProviders(<CallRoom consultationSessionId="session-3" />);

    await waitFor(() => expect(screen.getByTestId('livekit-room')).toBeInTheDocument());
    const room = screen.getByTestId('livekit-room');
    expect(room.dataset.token).toBe('real-jwt-token');
    expect(room.dataset.serverUrl).toBe('wss://orivex-test.livekit.cloud');
  });

  // Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7): the real
  // security boundary (RequiresIdentityVerificationGuard on
  // POST /consultations/:id/room-token, Patient callers only).
  it('shows the identity-verification gate instead of a generic error when the room-token mint is blocked', async () => {
    server.use(
      http.post(`${env.apiBaseUrl}${TELEMEDICINE_PATHS.roomToken('session-4')}`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'IDENTITY_VERIFICATION_REQUIRED',
              message: 'Identity verification required.',
              requestId: 'mock',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 403 },
        ),
      ),
    );

    renderWithProviders(<CallRoom consultationSessionId="session-4" />);

    expect(await screen.findByText('Verify your identity to join your consultation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start verification' })).toBeInTheDocument();
    expect(screen.queryByText('Could not start the video call. Please try again.')).not.toBeInTheDocument();
  });
});
