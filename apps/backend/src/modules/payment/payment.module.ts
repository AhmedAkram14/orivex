import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import type { EnvConfig } from '../../core/configuration/env.schema.js';
import type { DomainEvent } from '../../shared/domain/domain-event.js';
import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { PinoLoggerService } from '../../platform/logging/pino-logger.service.js';
import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';
import { ConfirmAppointmentUseCase } from '../consultation/application/use-cases/confirm-appointment/confirm-appointment.use-case.js';
import { GetAppointmentByIdUseCase } from '../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { ConsultationModule } from '../consultation/consultation.module.js';
import { DoctorModule } from '../doctor/doctor.module.js';
import { PatientModule } from '../patient/patient.module.js';
import { TrustGuardsModule } from '../trust/trust-guards.module.js';

import type { PaymentGatewayPort } from './application/ports/payment-gateway.port.js';
import { PAYMENT_GATEWAY, PAYMENT_TRANSACTION_REPOSITORY } from './application/ports/tokens.js';
import {
  AutoRefundOnDoctorCancellationHandler,
  type AppointmentCancelledEventPayload,
} from './application/event-handlers/auto-refund-on-doctor-cancellation.handler.js';
import { GetPaymentTransactionByConsultationSessionIdUseCase } from './application/use-cases/get-payment-transaction-by-consultation-session-id/get-payment-transaction-by-consultation-session-id.use-case.js';
import { GetPaymentTransactionByIdUseCase } from './application/use-cases/get-payment-transaction-by-id/get-payment-transaction-by-id.use-case.js';
import { InitiateChargeUseCase } from './application/use-cases/initiate-charge/initiate-charge.use-case.js';
import { ReconcileStripeWebhookEventUseCase } from './application/use-cases/reconcile-stripe-webhook-event/reconcile-stripe-webhook-event.use-case.js';
import { RefundPaymentUseCase } from './application/use-cases/refund-payment/refund-payment.use-case.js';
import type { PaymentTransactionRepository } from './domain/repositories/payment-transaction.repository.js';
import { NotConfiguredPaymentGatewayAdapter } from './infrastructure/gateway/not-configured-payment-gateway.adapter.js';
import { StripePaymentGatewayAdapter } from './infrastructure/gateway/stripe-payment-gateway.adapter.js';
import { PrismaPaymentTransactionRepository } from './infrastructure/prisma/prisma-payment-transaction.repository.js';
import { PaymentWebhookController } from './presentation/controllers/payment-webhook.controller.js';
import { PaymentController } from './presentation/controllers/payment.controller.js';

// Imports ConsultationModule to consume its own exported use cases
// (module-to-module calls only through a published interface, never
// another module's repository — docs/10-backend-architecture.md Section
// 11). Consultation Pricing Redesign: InitiateChargeUseCase itself no
// longer depends on DoctorModule -- it used to load DoctorProfile solely to
// validate a charge amount against consultationFeeAmount; that validation
// now reads the Appointment's own frozen pricing snapshot (already
// available via GetAppointmentByIdUseCase below). DoctorModule is still
// imported at the module level, though: PaymentController itself (not
// InitiateChargeUseCase) needs GetDoctorProfileByAccountIdUseCase for its
// doctor-facing routes (getByConsultationSessionId, refund ownership
// checks) -- a real, separate dependency this module always had. None of
// these modules import PaymentModule back -- no circular imports, no
// forwardRef().
//
// PAYMENT_GATEWAY binds StripePaymentGatewayAdapter when STRIPE_SECRET_KEY
// is configured (ORIVEX Roadmap 2.0 implementation program, Stage 1),
// falling back to NotConfiguredPaymentGatewayAdapter otherwise -- the
// module stays fully registered either way (architect direction: "do not
// leave finished modules disconnected from AppModule"). Dependency
// inversion stays intact; the missing dependency is explicit when unset;
// the app boots cleanly; only an actual initiateCharge/refund call fails
// with a clear error naming exactly what's missing, on the fallback path.
@Module({
  imports: [ConsultationModule, DoctorModule, PatientModule, AuthenticationGuardsModule, TrustGuardsModule],
  controllers: [PaymentController, PaymentWebhookController],
  providers: [
    { provide: PAYMENT_TRANSACTION_REPOSITORY, useClass: PrismaPaymentTransactionRepository },
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (configService: ConfigService<EnvConfig, true>): PaymentGatewayPort => {
        const secretKey = configService.get('STRIPE_SECRET_KEY', { infer: true });
        return secretKey ? new StripePaymentGatewayAdapter(new Stripe(secretKey)) : new NotConfiguredPaymentGatewayAdapter();
      },
      inject: [ConfigService],
    },
    {
      provide: GetPaymentTransactionByIdUseCase,
      useFactory: (repository: PaymentTransactionRepository) => new GetPaymentTransactionByIdUseCase(repository),
      inject: [PAYMENT_TRANSACTION_REPOSITORY],
    },
    {
      provide: GetPaymentTransactionByConsultationSessionIdUseCase,
      useFactory: (repository: PaymentTransactionRepository) =>
        new GetPaymentTransactionByConsultationSessionIdUseCase(repository),
      inject: [PAYMENT_TRANSACTION_REPOSITORY],
    },
    {
      provide: InitiateChargeUseCase,
      useFactory: (
        repository: PaymentTransactionRepository,
        eventDispatcher: DomainEventDispatcher,
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        confirmAppointmentUseCase: ConfirmAppointmentUseCase,
        paymentGateway: PaymentGatewayPort,
      ) =>
        new InitiateChargeUseCase(repository, eventDispatcher, getAppointmentByIdUseCase, confirmAppointmentUseCase, paymentGateway),
      inject: [PAYMENT_TRANSACTION_REPOSITORY, DOMAIN_EVENT_DISPATCHER, GetAppointmentByIdUseCase, ConfirmAppointmentUseCase, PAYMENT_GATEWAY],
    },
    {
      provide: RefundPaymentUseCase,
      useFactory: (
        repository: PaymentTransactionRepository,
        paymentGateway: PaymentGatewayPort,
        eventDispatcher: DomainEventDispatcher,
      ) => new RefundPaymentUseCase(repository, paymentGateway, eventDispatcher),
      inject: [PAYMENT_TRANSACTION_REPOSITORY, PAYMENT_GATEWAY, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: ReconcileStripeWebhookEventUseCase,
      useFactory: (repository: PaymentTransactionRepository, eventDispatcher: DomainEventDispatcher) =>
        new ReconcileStripeWebhookEventUseCase(repository, eventDispatcher),
      inject: [PAYMENT_TRANSACTION_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
    },
    {
      // Reacts to ConsultationModule's 'consultation.appointment.cancelled'
      // event -- see the handler's own comment for the exact refund rule.
      provide: AutoRefundOnDoctorCancellationHandler,
      useFactory: (
        repository: PaymentTransactionRepository,
        refundPaymentUseCase: RefundPaymentUseCase,
        logger: PinoLoggerService,
        dispatcher: DomainEventDispatcher,
      ) => {
        const handler = new AutoRefundOnDoctorCancellationHandler(repository, refundPaymentUseCase, logger);
        dispatcher.subscribe('consultation.appointment.cancelled', (event: DomainEvent) =>
          handler.handle(event as unknown as AppointmentCancelledEventPayload),
        );
        return handler;
      },
      inject: [PAYMENT_TRANSACTION_REPOSITORY, RefundPaymentUseCase, PinoLoggerService, DOMAIN_EVENT_DISPATCHER],
    },
  ],
  exports: [GetPaymentTransactionByIdUseCase, InitiateChargeUseCase, RefundPaymentUseCase],
})
export class PaymentModule {}
