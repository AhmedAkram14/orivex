import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';

import { ConsultationCopilotPanel } from './consultation-copilot-panel';

const SESSION_ID = 'session-1';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ConsultationCopilotPanel', () => {
  it('does not request a suggestion on mount -- only on an explicit action click', async () => {
    let requestCount = 0;
    server.use(
      http.post(`${env.apiBaseUrl}/ai/suggestions`, () => {
        requestCount += 1;
        return HttpResponse.json({ data: { status: 'unavailable', warnings: [] } });
      }),
    );

    renderWithProviders(<ConsultationCopilotPanel consultationSessionId={SESSION_ID} isConsultationInProgress />);

    expect(requestCount).toBe(0);
  });

  it('shows a notice instead of action buttons when the consultation is not in progress', () => {
    renderWithProviders(<ConsultationCopilotPanel consultationSessionId={SESSION_ID} isConsultationInProgress={false} />);

    expect(screen.getByText('AI Copilot is available once the consultation is in progress.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Draft SOAP note' })).not.toBeInTheDocument();
  });

  it('requests a real suggestion via the real API on click, shows it marked as an AI-generated draft', async () => {
    server.use(
      http.post(`${env.apiBaseUrl}/ai/suggestions`, async ({ request }) => {
        const body = (await request.json()) as { suggestionType: string };
        return HttpResponse.json({
          data: {
            id: 'suggestion-1',
            consultationSessionId: SESSION_ID,
            suggestionType: body.suggestionType,
            content: 'Real drafted SOAP content.',
            confidenceScore: null,
            safetyFlags: [],
            requiresAcknowledgment: true,
            doctorDecision: null,
            decisionJustification: null,
            generatedAt: '2026-09-07T10:00:00.000Z',
          },
        });
      }),
    );

    renderWithProviders(<ConsultationCopilotPanel consultationSessionId={SESSION_ID} isConsultationInProgress />);

    await userEvent.click(screen.getByRole('button', { name: 'Draft SOAP note' }));

    expect(await screen.findByText('Real drafted SOAP content.')).toBeInTheDocument();
    expect(screen.getByText('AI-generated draft — review before use.')).toBeInTheDocument();
  });

  it('shows the unavailable notice (not an error) when the backend returns the documented degraded mode', async () => {
    server.use(
      http.post(`${env.apiBaseUrl}/ai/suggestions`, () =>
        HttpResponse.json({ data: { status: 'unavailable', warnings: ['No AI provider configured.'] } }),
      ),
    );

    renderWithProviders(<ConsultationCopilotPanel consultationSessionId={SESSION_ID} isConsultationInProgress />);

    await userEvent.click(screen.getByRole('button', { name: 'Summarize consultation' }));

    expect(await screen.findByText('No AI provider configured.')).toBeInTheDocument();
  });

  it('a network failure shows a recoverable error without breaking the panel', async () => {
    server.use(http.post(`${env.apiBaseUrl}/ai/suggestions`, () => HttpResponse.error()));

    renderWithProviders(<ConsultationCopilotPanel consultationSessionId={SESSION_ID} isConsultationInProgress />);

    await userEvent.click(screen.getByRole('button', { name: 'Summarize consultation' }));

    expect(await screen.findByText("Couldn't reach the AI Copilot. You can keep working without it.")).toBeInTheDocument();
    // The rest of the panel (its other action buttons) remains usable.
    expect(screen.getByRole('button', { name: 'Draft SOAP note' })).toBeEnabled();
  });

  it('approve calls the real decision endpoint with decision=approved', async () => {
    let lastBody: unknown;
    server.use(
      http.post(`${env.apiBaseUrl}/ai/suggestions`, () =>
        HttpResponse.json({
          data: {
            id: 'suggestion-2',
            consultationSessionId: SESSION_ID,
            suggestionType: 'summary',
            content: 'A summary draft.',
            confidenceScore: null,
            safetyFlags: [],
            requiresAcknowledgment: true,
            doctorDecision: null,
            decisionJustification: null,
            generatedAt: '2026-09-07T10:00:00.000Z',
          },
        }),
      ),
      http.patch(`${env.apiBaseUrl}/ai/suggestions/suggestion-2`, async ({ request }) => {
        lastBody = await request.json();
        return HttpResponse.json({
          data: {
            id: 'suggestion-2',
            consultationSessionId: SESSION_ID,
            suggestionType: 'summary',
            content: 'A summary draft.',
            confidenceScore: null,
            safetyFlags: [],
            requiresAcknowledgment: true,
            doctorDecision: 'approved',
            decisionJustification: null,
            generatedAt: '2026-09-07T10:00:00.000Z',
          },
        });
      }),
    );

    renderWithProviders(<ConsultationCopilotPanel consultationSessionId={SESSION_ID} isConsultationInProgress />);
    await userEvent.click(screen.getByRole('button', { name: 'Summarize consultation' }));
    await screen.findByText('A summary draft.');

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(lastBody).toEqual({ decision: 'approved', justification: undefined }));
    expect(await screen.findByText('You approved this suggestion.')).toBeInTheDocument();
  });

  it('reject requires an explicit justification before it will call the decision endpoint', async () => {
    let patchCallCount = 0;
    server.use(
      http.post(`${env.apiBaseUrl}/ai/suggestions`, () =>
        HttpResponse.json({
          data: {
            id: 'suggestion-3',
            consultationSessionId: SESSION_ID,
            suggestionType: 'follow_up_plan',
            content: 'A follow-up plan draft.',
            confidenceScore: null,
            safetyFlags: [],
            requiresAcknowledgment: true,
            doctorDecision: null,
            decisionJustification: null,
            generatedAt: '2026-09-07T10:00:00.000Z',
          },
        }),
      ),
      http.patch(`${env.apiBaseUrl}/ai/suggestions/suggestion-3`, async ({ request }) => {
        patchCallCount += 1;
        const body = (await request.json()) as { decision: string; justification?: string };
        return HttpResponse.json({
          data: {
            id: 'suggestion-3',
            consultationSessionId: SESSION_ID,
            suggestionType: 'follow_up_plan',
            content: 'A follow-up plan draft.',
            confidenceScore: null,
            safetyFlags: [],
            requiresAcknowledgment: true,
            doctorDecision: body.decision,
            decisionJustification: body.justification ?? null,
            generatedAt: '2026-09-07T10:00:00.000Z',
          },
        });
      }),
    );

    renderWithProviders(<ConsultationCopilotPanel consultationSessionId={SESSION_ID} isConsultationInProgress />);
    await userEvent.click(screen.getByRole('button', { name: 'Draft follow-up plan' }));
    await screen.findByText('A follow-up plan draft.');

    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    // The reject-confirmation textarea is now showing; clicking the real Reject button with no reason must not call the API.
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(patchCallCount).toBe(0);
    expect(screen.getByText('A reason is required to reject this suggestion.')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("Why isn't this suggestion useful?"), 'Not clinically relevant.');
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));

    expect(await screen.findByText('You rejected this suggestion.')).toBeInTheDocument();
    expect(patchCallCount).toBe(1);
  });

  it('edit + save sends decision=edited with the edited content as the justification (the real backend has no separate edited-content field)', async () => {
    let lastBody: { decision: string; justification?: string } | undefined;
    server.use(
      http.post(`${env.apiBaseUrl}/ai/suggestions`, () =>
        HttpResponse.json({
          data: {
            id: 'suggestion-4',
            consultationSessionId: SESSION_ID,
            suggestionType: 'prescription_draft',
            content: 'Original AI draft text.',
            confidenceScore: null,
            safetyFlags: [],
            requiresAcknowledgment: true,
            doctorDecision: null,
            decisionJustification: null,
            generatedAt: '2026-09-07T10:00:00.000Z',
          },
        }),
      ),
      http.patch(`${env.apiBaseUrl}/ai/suggestions/suggestion-4`, async ({ request }) => {
        lastBody = (await request.json()) as { decision: string; justification?: string };
        return HttpResponse.json({
          data: {
            id: 'suggestion-4',
            consultationSessionId: SESSION_ID,
            suggestionType: 'prescription_draft',
            content: 'Original AI draft text.',
            confidenceScore: null,
            safetyFlags: [],
            requiresAcknowledgment: true,
            doctorDecision: 'edited',
            decisionJustification: lastBody?.justification ?? null,
            generatedAt: '2026-09-07T10:00:00.000Z',
          },
        });
      }),
    );

    renderWithProviders(<ConsultationCopilotPanel consultationSessionId={SESSION_ID} isConsultationInProgress />);
    await userEvent.click(screen.getByRole('button', { name: 'Draft prescription' }));
    await screen.findByText('Original AI draft text.');

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const textbox = screen.getByRole('textbox', { name: 'Edit suggestion content' });
    await userEvent.clear(textbox);
    await userEvent.type(textbox, 'Doctor-edited version of the draft.');
    await userEvent.click(screen.getByRole('button', { name: 'Save as edited' }));

    await waitFor(() => expect(lastBody).toEqual({ decision: 'edited', justification: 'Doctor-edited version of the draft.' }));
    expect(await screen.findByText('You saved an edited version of this suggestion.')).toBeInTheDocument();
  });

  it('collapsing the panel hides it but keeps the generated suggestion -- expanding again shows it unchanged', async () => {
    server.use(
      http.post(`${env.apiBaseUrl}/ai/suggestions`, () =>
        HttpResponse.json({
          data: {
            id: 'suggestion-5',
            consultationSessionId: SESSION_ID,
            suggestionType: 'summary',
            content: 'A persisted-in-state draft.',
            confidenceScore: null,
            safetyFlags: [],
            requiresAcknowledgment: true,
            doctorDecision: null,
            decisionJustification: null,
            generatedAt: '2026-09-07T10:00:00.000Z',
          },
        }),
      ),
    );

    renderWithProviders(<ConsultationCopilotPanel consultationSessionId={SESSION_ID} isConsultationInProgress />);
    await userEvent.click(screen.getByRole('button', { name: 'Summarize consultation' }));
    await screen.findByText('A persisted-in-state draft.');

    await userEvent.click(screen.getByRole('button', { name: 'Collapse AI Copilot' }));
    expect(screen.queryByText('A persisted-in-state draft.')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Expand AI Copilot' }));
    expect(screen.getByText('A persisted-in-state draft.')).toBeInTheDocument();
  });

  it('interaction_flag suggestions are visually distinct and never presented as a confirmed fact', async () => {
    server.use(
      http.post(`${env.apiBaseUrl}/ai/suggestions`, () =>
        HttpResponse.json({
          data: {
            id: 'suggestion-6',
            consultationSessionId: SESSION_ID,
            suggestionType: 'interaction_flag',
            content: 'Potential interaction flagged for review.',
            confidenceScore: null,
            safetyFlags: ['possible_interaction'],
            requiresAcknowledgment: true,
            doctorDecision: null,
            decisionJustification: null,
            generatedAt: '2026-09-07T10:00:00.000Z',
          },
        }),
      ),
    );

    renderWithProviders(<ConsultationCopilotPanel consultationSessionId={SESSION_ID} isConsultationInProgress />);
    await userEvent.click(screen.getByRole('button', { name: 'Check drug/allergy interactions' }));

    expect(await screen.findByText('AI-generated safety flag — verify before acting on it.')).toBeInTheDocument();
  });
});
