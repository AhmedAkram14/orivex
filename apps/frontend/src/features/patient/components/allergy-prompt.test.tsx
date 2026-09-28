import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { AllergyPrompt } from './allergy-prompt';

const base = () => env.apiBaseUrl;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function capturePatch() {
  const bodies: unknown[] = [];
  server.use(
    http.patch(`${base()}/patients/me`, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({ data: { id: 'p1', allergiesStatus: 'none_reported', emergencyContacts: [] } });
    }),
  );
  return bodies;
}

describe('AllergyPrompt', () => {
  it('saves "None known" to the profile as allergiesStatus none_reported, never as allergy text', async () => {
    const bodies = capturePatch();
    renderWithProviders(<AllergyPrompt />);

    await userEvent.click(screen.getByRole('button', { name: 'None known' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ allergiesStatus: 'none_reported' });
  });

  it('saves typed allergies as text only, leaving the status for the server to derive', async () => {
    const bodies = capturePatch();
    renderWithProviders(<AllergyPrompt />);

    await userEvent.type(screen.getByLabelText('Allergies'), 'Latex{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Save allergies' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ allergies: 'Latex' });
  });

  it('keeps the save button disabled until an allergy is typed', () => {
    renderWithProviders(<AllergyPrompt />);
    expect(screen.getByRole('button', { name: 'Save allergies' })).toBeDisabled();
  });
});
