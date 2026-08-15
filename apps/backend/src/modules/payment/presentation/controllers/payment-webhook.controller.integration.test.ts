import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConfigService } from '@nestjs/config';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import Stripe from 'stripe';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { PaymentTransaction } from '../../domain/entities/payment-transaction.entity.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';
import { PaymentStatus } from '../../domain/enums/payment-status.enum.js';
import type { PaymentTransactionRepository } from '../../domain/repositories/payment-transaction.repository.js';
import { Money } from '../../domain/value-objects/money.value-object.js';
import { ReconcileStripeWebhookEventUseCase } from '../../application/use-cases/reconcile-stripe-webhook-event/reconcile-stripe-webhook-event.use-case.js';

import { PaymentWebhookController } from './payment-webhook.controller.js';

const STRIPE_SECRET_KEY = 'sk_test_dummy';
const STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

class FakePaymentTransactionRepository implements PaymentTransactionRepository {
  public readonly saved: PaymentTransaction[] = [];
  private readonly byExternalReference = new Map<string, PaymentTransaction>();
  seed(transaction: PaymentTransaction): void {
    const ref = transaction.getExternalReference();
    if (ref) this.byExternalReference.set(ref, transaction);
  }
  async findById(): Promise<PaymentTransaction | null> {
    return null;
  }
  async findByIdempotencyKey(): Promise<PaymentTransaction | null> {
    return null;
  }
  async findByExternalReference(externalReference: string): Promise<PaymentTransaction | null> {
    return this.byExternalReference.get(externalReference) ?? null;
  }
  async findByConsultationSessionId(): Promise<PaymentTransaction | null> {
    return null;
  }
  async findByAppointmentId(): Promise<PaymentTransaction | null> {
    return null;
  }
  async findAll(): Promise<{ transactions: PaymentTransaction[]; total: number }> {
    return { transactions: [], total: 0 };
  }
  async save(transaction: PaymentTransaction): Promise<void> {
    this.saved.push(transaction);
  }
}

class RecordingDispatcher {
  public readonly dispatched: DomainEvent[] = [];
  async dispatch(events: DomainEvent[]): Promise<void> {
    this.dispatched.push(...events);
  }
  subscribe(): void {}
}

function buildInitiatedTransaction(externalReference: string): PaymentTransaction {
  const transaction = PaymentTransaction.initiate({
    idempotencyKey: `idem-key-${externalReference}`,
    appointmentId: '99999999-9999-4999-8999-999999999999',
    consultationSessionId: '11111111-1111-4111-8111-111111111111',
    patientId: '22222222-2222-4222-8222-222222222222',
    doctorId: '33333333-3333-4333-8333-333333333333',
    amount: Money.create(500, 'EGP'),
    paymentMethod: PaymentMethod.Card,
  });
  transaction.attachExternalReference(externalReference);
  return transaction;
}

function signedPayload(payload: object, secret = STRIPE_WEBHOOK_SECRET): { body: string; signature: string } {
  const body = JSON.stringify(payload);
  const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret });
  return { body, signature };
}

function paymentIntentEvent(type: 'payment_intent.succeeded' | 'payment_intent.payment_failed', paymentIntentId: string) {
  return { id: 'evt_1', object: 'event', type, data: { object: { id: paymentIntentId } } };
}

function chargeRefundedEvent(paymentIntentId: string) {
  return { id: 'evt_1', object: 'event', type: 'charge.refunded', data: { object: { payment_intent: paymentIntentId } } };
}

async function buildApp(options: {
  configured?: boolean;
  repository?: FakePaymentTransactionRepository;
  dispatcher?: RecordingDispatcher;
} = {}): Promise<{ app: INestApplication; repository: FakePaymentTransactionRepository; dispatcher: RecordingDispatcher }> {
  const configured = options.configured ?? true;
  const repository = options.repository ?? new FakePaymentTransactionRepository();
  const dispatcher = options.dispatcher ?? new RecordingDispatcher();

  const configService = {
    get: (key: string) => {
      if (key === 'STRIPE_SECRET_KEY') return configured ? STRIPE_SECRET_KEY : undefined;
      if (key === 'STRIPE_WEBHOOK_SECRET') return configured ? STRIPE_WEBHOOK_SECRET : undefined;
      return undefined;
    },
  };

  const moduleRef = await Test.createTestingModule({
    controllers: [PaymentWebhookController],
    providers: [
      PinoLoggerService,
      { provide: ConfigService, useValue: configService },
      {
        provide: ReconcileStripeWebhookEventUseCase,
        useValue: new ReconcileStripeWebhookEventUseCase(repository, dispatcher),
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication({ rawBody: true });
  app.useGlobalFilters(new AllExceptionsFilter(moduleRef.get(PinoLoggerService)));
  await app.init();

  return { app, repository, dispatcher };
}

describe('PaymentWebhookController (integration)', () => {
  it('returns 503 when Stripe is not configured', async () => {
    const { app } = await buildApp({ configured: false });
    try {
      const { body, signature } = signedPayload(paymentIntentEvent('payment_intent.succeeded', 'pi_x'));
      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(body)
        .expect(503);

      assert.equal(response.body.error.code, 'HTTP_ERROR');
    } finally {
      await app.close();
    }
  });

  it('returns 422 (VALIDATION_FAILED) when the stripe-signature header is missing', async () => {
    const { app } = await buildApp();
    try {
      const { body } = signedPayload(paymentIntentEvent('payment_intent.succeeded', 'pi_x'));
      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .send(body)
        .expect(422);

      assert.equal(response.body.error.code, 'VALIDATION_FAILED');
    } finally {
      await app.close();
    }
  });

  it('returns 422 (VALIDATION_FAILED) for an invalid/tampered signature', async () => {
    const { app } = await buildApp();
    try {
      const { body } = signedPayload(paymentIntentEvent('payment_intent.succeeded', 'pi_x'));
      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 't=1,v1=deadbeef')
        .send(body)
        .expect(422);

      assert.equal(response.body.error.code, 'VALIDATION_FAILED');
    } finally {
      await app.close();
    }
  });

  it('returns 422 for a signature computed with the wrong webhook secret', async () => {
    const { app } = await buildApp();
    try {
      const { body, signature } = signedPayload(paymentIntentEvent('payment_intent.succeeded', 'pi_x'), 'whsec_wrong_secret');
      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(body)
        .expect(422);

      assert.equal(response.body.error.code, 'VALIDATION_FAILED');
    } finally {
      await app.close();
    }
  });

  it('reconciles a payment_intent.succeeded event: marks the matching Initiated transaction Succeeded', async () => {
    const repository = new FakePaymentTransactionRepository();
    const transaction = buildInitiatedTransaction('pi_succeed_hook');
    repository.seed(transaction);
    const { app } = await buildApp({ repository });
    try {
      const { body, signature } = signedPayload(paymentIntentEvent('payment_intent.succeeded', 'pi_succeed_hook'));
      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(body)
        .expect(200);

      assert.deepEqual(response.body, { received: true });
      assert.equal(transaction.getStatus(), PaymentStatus.Succeeded);
      assert.equal(repository.saved.length, 1);
    } finally {
      await app.close();
    }
  });

  it('reconciles a payment_intent.payment_failed event: marks the matching Initiated transaction Failed', async () => {
    const repository = new FakePaymentTransactionRepository();
    const transaction = buildInitiatedTransaction('pi_fail_hook');
    repository.seed(transaction);
    const { app } = await buildApp({ repository });
    try {
      const { body, signature } = signedPayload(paymentIntentEvent('payment_intent.payment_failed', 'pi_fail_hook'));
      await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(body)
        .expect(200);

      assert.equal(transaction.getStatus(), PaymentStatus.Failed);
      assert.equal(repository.saved.length, 1);
    } finally {
      await app.close();
    }
  });

  it('a charge.refunded event never mutates the transaction -- confirmation-only, refunds are applied via RefundPaymentUseCase', async () => {
    const repository = new FakePaymentTransactionRepository();
    const transaction = buildInitiatedTransaction('pi_refund_hook');
    transaction.markSucceeded();
    transaction.releaseDomainEvents();
    repository.seed(transaction);
    const { app } = await buildApp({ repository });
    try {
      const { body, signature } = signedPayload(chargeRefundedEvent('pi_refund_hook'));
      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(body)
        .expect(200);

      assert.deepEqual(response.body, { received: true });
      assert.equal(transaction.getStatus(), PaymentStatus.Succeeded);
      assert.equal(repository.saved.length, 0);
    } finally {
      await app.close();
    }
  });

  it('is a silent no-op (200, not an error) for an unknown externalReference', async () => {
    const repository = new FakePaymentTransactionRepository();
    const { app } = await buildApp({ repository });
    try {
      const { body, signature } = signedPayload(paymentIntentEvent('payment_intent.succeeded', 'pi_never_seen'));
      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(body)
        .expect(200);

      assert.deepEqual(response.body, { received: true });
      assert.equal(repository.saved.length, 0);
    } finally {
      await app.close();
    }
  });

  it('ignores an unhandled event type (e.g. customer.created) without error', async () => {
    const { app } = await buildApp();
    try {
      const { body, signature } = signedPayload({ id: 'evt_1', object: 'event', type: 'customer.created', data: { object: { id: 'cus_1' } } });
      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(body)
        .expect(200);

      assert.deepEqual(response.body, { received: true });
    } finally {
      await app.close();
    }
  });

  it('is idempotent for a duplicate webhook delivery: redelivering the same succeeded event never double-applies', async () => {
    const repository = new FakePaymentTransactionRepository();
    const transaction = buildInitiatedTransaction('pi_duplicate_hook');
    repository.seed(transaction);
    const { app } = await buildApp({ repository });
    try {
      const { body, signature } = signedPayload(paymentIntentEvent('payment_intent.succeeded', 'pi_duplicate_hook'));

      await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(body)
        .expect(200);

      // Stripe redelivers on any retry/at-least-once semantics -- the exact
      // same event body/signature arriving twice must never double-apply.
      const redelivery = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(body)
        .expect(200);

      assert.deepEqual(redelivery.body, { received: true });
      assert.equal(transaction.getStatus(), PaymentStatus.Succeeded);
      assert.equal(repository.saved.length, 1, 'the second, redundant delivery must not persist again');
    } finally {
      await app.close();
    }
  });
});
