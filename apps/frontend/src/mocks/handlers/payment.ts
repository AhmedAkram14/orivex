import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { PAYMENT_PATHS } from '@/features/payment/api/paths';
import type { InitiateChargeRequest } from '@/features/payment/api/types';
import { attachConsultationSessionId, createCharge, getByConsultationSessionId, getById, refundTransaction } from '@/mocks/payment-store';
import { confirmAppointmentAfterPayment, getAppointmentById } from '@/mocks/patient-store';
import { identityVerificationRequiredResponse, isPatientVerified } from '@/mocks/identity-verification-gate';

const base = () => env.apiBaseUrl;

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json(
    { error: { code, message, requestId: 'mock-request', timestamp: new Date().toISOString() } },
    { status },
  );
}

export const paymentHandlers = [
  // Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7): matches the
  // real backend's RequiresIdentityVerificationGuard on POST /payments.
  //
  // Consultation Pricing Lifecycle Completion (pay-then-confirm): mirrors
  // InitiateChargeUseCase -- validates the appointment is still `requested`
  // and genuinely Paid (mocking the real "not awaiting payment"/free-charge
  // guards), then confirms it on a successful charge, same as the real
  // ConfirmAppointmentUseCase call.
  http.post(`${base()}${PAYMENT_PATHS.initiateCharge}`, async ({ request }) => {
    if (!isPatientVerified()) {
      return identityVerificationRequiredResponse();
    }
    const body = (await request.json()) as InitiateChargeRequest;
    const appointment = getAppointmentById(body.appointmentId);
    if (!appointment) {
      return errorResponse(404, 'NOT_FOUND', `Appointment "${body.appointmentId}" not found.`);
    }
    if (appointment.status !== 'requested' || appointment.consultationType !== 'paid') {
      return errorResponse(422, 'VALIDATION_FAILED', `Appointment "${body.appointmentId}" is not awaiting payment.`);
    }

    const transaction = createCharge(body);
    confirmAppointmentAfterPayment(body.appointmentId);
    const consultationSessionId = `session-${body.appointmentId}`;
    attachConsultationSessionId(transaction.id, consultationSessionId);
    return HttpResponse.json({ data: { ...transaction, consultationSessionId } }, { status: 201 });
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
