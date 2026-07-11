import { Injectable } from '@nestjs/common';

import { PaymentDomainError } from '../../domain/exceptions/payment-domain.error.js';
import type {
  AuthorizePaymentRequest,
  AuthorizePaymentResult,
  PaymentGatewayPort,
} from '../../application/ports/payment-gateway.port.js';

// Explicit stand-in for the "external PSP adapter" (docs/10-backend-
// architecture.md's PaymentModule dependency) -- no PSP has been selected
// yet (docs/01-prd.md's "buy, always, for payments" decision names no
// vendor). This performs no payment logic and never fabricates a
// succeeded/failed outcome; it fails loudly and explicitly the moment
// authorize() is actually invoked, so PaymentModule can stay fully wired
// into the running application (architect direction) without silently
// pretending payments work. Replace with a real adapter the moment a PSP
// is chosen -- PaymentGatewayPort and InitiateChargeUseCase do not change.
@Injectable()
export class NotConfiguredPaymentGatewayAdapter implements PaymentGatewayPort {
  async authorize(_request: AuthorizePaymentRequest): Promise<AuthorizePaymentResult> {
    throw new PaymentDomainError(
      'PaymentGatewayPort has no configured provider -- no PSP has been selected yet. ' +
        'Payments cannot be processed until a real adapter is chosen and bound.',
    );
  }
}
