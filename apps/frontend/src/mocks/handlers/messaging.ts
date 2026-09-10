import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import {
  listMessages,
  listThreadsForAccount,
  markThreadRead,
  sendMessage,
  startOrGetThread,
} from '@/mocks/messaging-store';
import { resolveRequestAccountId } from '@/mocks/request-account';
import { LEGACY_PATIENT_ACCOUNT_ID } from '@/mocks/auth-store';

const base = () => env.apiBaseUrl;

function notFound(message: string) {
  return HttpResponse.json(
    { error: { code: 'NOT_FOUND', message, requestId: 'mock', timestamp: new Date().toISOString() } },
    { status: 404 },
  );
}

/** Real backend endpoints (MessagingModule's MessageThreadController, I7 -- docs/01-prd.md §2.13). */
export const messagingHandlers = [
  http.get(`${base()}/message-threads`, ({ request }) => {
    const accountId = resolveRequestAccountId(request) ?? LEGACY_PATIENT_ACCOUNT_ID;
    return HttpResponse.json({ data: listThreadsForAccount(accountId) });
  }),

  http.post(`${base()}/message-threads`, async ({ request }) => {
    const accountId = resolveRequestAccountId(request) ?? LEGACY_PATIENT_ACCOUNT_ID;
    const body = (await request.json()) as { appointmentId: string };
    return HttpResponse.json({ data: startOrGetThread(body.appointmentId, accountId) }, { status: 201 });
  }),

  http.get(`${base()}/message-threads/:id/messages`, ({ params }) => {
    return HttpResponse.json({ data: listMessages(params.id as string) });
  }),

  http.post(`${base()}/message-threads/:id/messages`, async ({ request, params }) => {
    const accountId = resolveRequestAccountId(request) ?? LEGACY_PATIENT_ACCOUNT_ID;
    const body = (await request.json()) as { body: string; attachmentAssetId?: string };
    const message = sendMessage(params.id as string, accountId, body.body, body.attachmentAssetId);
    if (!message) {
      return notFound('Message thread not found.');
    }
    return HttpResponse.json({ data: message }, { status: 201 });
  }),

  http.patch(`${base()}/message-threads/:id/read`, ({ request, params }) => {
    const accountId = resolveRequestAccountId(request) ?? LEGACY_PATIENT_ACCOUNT_ID;
    const acknowledged = markThreadRead(params.id as string, accountId);
    if (!acknowledged) {
      return notFound('Message thread not found.');
    }
    return HttpResponse.json({ data: { acknowledged: true } });
  }),
];
