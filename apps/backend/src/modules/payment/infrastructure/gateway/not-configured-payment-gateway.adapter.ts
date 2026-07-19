import { Injectable } from '@nestjs/common';

import { PaymentDomainError } from '../../domain/exceptions/payment-domain.error.js';
import type {
  AuthorizePaymentRequest,
  AuthorizePaymentResult,
  PaymentGatewayPort,
  RefundPaymentRequest,
  RefundPaymentResult,
} from '../../application/ports/payment-gateway.port.js';

// Explicit stand-in for the "external PSP adapter" (docs/10-backend-
// architecture.md's PaymentModule dependency) -- bound whenever
// STRIPE_SECRET_KEY is unset (see payment.module.ts). This performs no
// payment logic and never fabricates a succeeded/failed outcome; it fails
// loudly and explicitly the moment authorize()/refund() is actually
// invoked, so PaymentModule can stay fully wired into the running
// application without silently pretending payments work.
@Injectable()
export class NotConfiguredPaymentGatewayAdapter implements PaymentGatewayPort {
  async authorize(_request: AuthorizePaymentRequest): Promise<AuthorizePaymentResult> {
    throw new PaymentDomainError(
      'PaymentGatewayPort has no configured provider -- STRIPE_SECRET_KEY is unset. ' +
        'Payments cannot be processed until a real adapter is chosen and bound.',
    );
  }

  async refund(_request: RefundPaymentRequest): Promise<RefundPaymentResult> {
    throw new PaymentDomainError(
      'PaymentGatewayPort has no configured provider -- STRIPE_SECRET_KEY is unset. ' +
        'Refunds cannot be processed until a real adapter is chosen and bound.',
    );
  }
}
