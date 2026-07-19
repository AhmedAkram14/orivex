import { Controller, Headers, HttpCode, HttpStatus, Post, Req, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import Stripe from 'stripe';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';
import { ValidationError } from '../../../../shared/errors/app-error.js';
import { ReconcileStripeWebhookEventCommand, type StripeWebhookOutcome } from '../../application/use-cases/reconcile-stripe-webhook-event/reconcile-stripe-webhook-event.command.js';
import { ReconcileStripeWebhookEventUseCase } from '../../application/use-cases/reconcile-stripe-webhook-event/reconcile-stripe-webhook-event.use-case.js';

// Deliberately its own controller, no JwtAuthGuard/RolesGuard -- Stripe is
// not an authenticated user of this API, and cannot present a Bearer
// token. Trust here comes entirely from verifying the request was signed
// by Stripe's own webhook secret (constructEvent()), computed over the
// exact raw byte payload (main.ts's `rawBody: true`), never the
// Nest-parsed/re-serialized body.
@Controller('payments/webhook')
@SkipThrottle()
export class PaymentWebhookController {
  constructor(
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly reconcileStripeWebhookEventUseCase: ReconcileStripeWebhookEventUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(@Req() request: RawBodyRequest<Request>, @Headers('stripe-signature') signature?: string): Promise<{ received: true }> {
    const secretKey = this.configService.get('STRIPE_SECRET_KEY', { infer: true });
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET', { infer: true });
    if (!secretKey || !webhookSecret) {
      throw new ServiceUnavailableException('Stripe is not configured; webhook events cannot be verified.');
    }
    if (!signature || !request.rawBody) {
      throw new ValidationError('Missing Stripe signature or raw request body.');
    }

    const stripe = new Stripe(secretKey);
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(request.rawBody, signature, webhookSecret);
    } catch {
      throw new ValidationError('Invalid Stripe webhook signature.');
    }

    const outcome = toOutcome(event);
    if (outcome) {
      const paymentIntentId = extractPaymentIntentId(event);
      if (paymentIntentId) {
        await this.reconcileStripeWebhookEventUseCase.execute(
          new ReconcileStripeWebhookEventCommand({ externalReference: paymentIntentId, outcome }),
        );
      }
    }

    return { received: true };
  }
}

function toOutcome(event: Stripe.Event): StripeWebhookOutcome | null {
  switch (event.type) {
    case 'payment_intent.succeeded':
      return 'succeeded';
    case 'payment_intent.payment_failed':
      return 'failed';
    case 'charge.refunded':
      return 'refunded';
    default:
      return null;
  }
}

function extractPaymentIntentId(event: Stripe.Event): string | null {
  const object = event.data.object as { id?: string; payment_intent?: string | null };
  if (event.type === 'charge.refunded') {
    return typeof object.payment_intent === 'string' ? object.payment_intent : null;
  }
  return typeof object.id === 'string' ? object.id : null;
}
