import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import { TELEMEDICINE_PATHS } from '@/features/telemedicine/api/paths';

import { JoinCallAction } from './join-call-action';

vi.mock('@livekit/components-react', () => ({
  LiveKitRoom: ({ token }: { token: string }) => <div data-testid="livekit-room" data-token={token} />,
  VideoConference: () => null,
  RoomAudioRenderer: () => null,
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('JoinCallAction', () => {
  it('opens the call room dialog and mints a room token only after the button is clicked', async () => {
    let requestCount = 0;
    server.use(
      http.post(`${env.apiBaseUrl}${TELEMEDICINE_PATHS.roomToken('session-1')}`, () => {
        requestCount += 1;
        return HttpResponse.json({ data: { token: 'jwt', url: 'wss://orivex-test.livekit.cloud' } });
      }),
    );

    renderWithProviders(<JoinCallAction consultationSessionId="session-1" />);

    expect(requestCount).toBe(0);

    await userEvent.click(screen.getByRole('button', { name: 'Join video call' }));

    await waitFor(() => expect(screen.getByTestId('livekit-room')).toBeInTheDocument());
    expect(requestCount).toBe(1);
  });
});
