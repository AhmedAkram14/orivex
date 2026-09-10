import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';

import { KnowledgeModerationQueue } from './knowledge-moderation-queue';

const base = () => env.apiBaseUrl;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function pendingArticle() {
  return {
    id: 'knowledge-article-1',
    authoringDoctorId: 'doctor-profile-1',
    title: 'Managing Hypertension at Home',
    body: 'Some real, doctor-authored content.',
    status: 'pending_review',
    moderationReason: null,
    moderatedByAccountId: null,
    moderatedAt: null,
    publishedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('KnowledgeModerationQueue', () => {
  it('shows the empty state when nothing is pending review', async () => {
    server.use(http.get(`${base()}/admin/knowledge/articles`, () => HttpResponse.json({ data: [] })));

    renderWithProviders(<KnowledgeModerationQueue />);

    expect(await screen.findByText('Nothing pending review')).toBeInTheDocument();
  });

  it('lists a pending article and approves it', async () => {
    server.use(http.get(`${base()}/admin/knowledge/articles`, () => HttpResponse.json({ data: [pendingArticle()] })));

    let sentBody: unknown;
    server.use(
      http.patch(`${base()}/admin/knowledge/articles/:id/moderate`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ data: { ...pendingArticle(), status: 'published' } });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<KnowledgeModerationQueue />);

    await screen.findByText('Managing Hypertension at Home');

    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await user.type(screen.getByPlaceholderText('Explain your decision'), 'Meets content quality guidelines.');
    await user.click(screen.getByRole('button', { name: 'Approve article' }));

    await waitFor(() =>
      expect(sentBody).toEqual({ status: 'published', reason: 'Meets content quality guidelines.' }),
    );
  });

  it('shows a load error when the queue request fails', async () => {
    server.use(
      http.get(`${base()}/admin/knowledge/articles`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom', requestId: 'r', timestamp: new Date().toISOString() } },
          { status: 500 },
        ),
      ),
    );

    renderWithProviders(<KnowledgeModerationQueue />);

    expect(await screen.findByText("Couldn't load the moderation queue.")).toBeInTheDocument();
  });
});
