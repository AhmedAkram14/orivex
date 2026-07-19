import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { PAYMENT_PATHS } from '@/features/payment/api/paths';
import type { InitiateChargeRequest } from '@/features/payment/api/types';
import { createCharge, getByConsultationSessionId, getById, refundTransaction } from '@/mocks/payment-store';

const base = () => env.apiBaseUrl;

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json(
    { error: { code, message, requestId: 'mock-request', timestamp: new Date().toISOString() } },
    { status },
  );
}

export const paymentHandlers = [
  http.post(`${base()}${PAYMENT_PATHS.initiateCharge}`, async ({ request }) => {
    const body = (await request.json()) as InitiateChargeRequest;
    return HttpResponse.json({ data: createCharge(body) }, { status: 201 });
  }),

  http.get(`${base()}/payments/by-consultation-session/:consultationSessionId`, ({ params }) => {
    const transaction = getByConsultationSessionId(params.consultationSessionId as string);
    return HttpResponse.json({ data: transaction });
  }),

  http.get(`${base()}${PAYMENT_PATHS.initiateCharge}/:id`, ({ params }) => {
    const transaction = getById(params.id as string);
    if (!transaction) {
      return errorResponse(404, 'NOT_FOUND', 'PaymentTransaction not found.');
    }
    return HttpResponse.json({ data: transaction });
  }),

  http.post(`${base()}${PAYMENT_PATHS.initiateCharge}/:id/refund`, ({ params }) => {
    const result = refundTransaction(params.id as string);
    if (result.outcome === 'not-found') {
      return errorResponse(404, 'NOT_FOUND', 'PaymentTransaction not found.');
    }
    if (result.outcome === 'already-refunded') {
      return errorResponse(422, 'VALIDATION_FAILED', 'This transaction has already been refunded.');
    }
    return HttpResponse.json({ data: result.transaction });
  }),
];
