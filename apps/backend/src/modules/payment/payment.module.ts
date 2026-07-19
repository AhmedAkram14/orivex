import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import type { EnvConfig } from '../../core/configuration/env.schema.js';
import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';
import { ConfirmAppointmentUseCase } from '../consultation/application/use-cases/confirm-appointment/confirm-appointment.use-case.js';
import { GetAppointmentByIdUseCase } from '../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { ConsultationModule } from '../consultation/consultation.module.js';
import { GetDoctorProfileByIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorModule } from '../doctor/doctor.module.js';
import { PatientModule } from '../patient/patient.module.js';

import type { PaymentGatewayPort } from './application/ports/payment-gateway.port.js';
import { PAYMENT_GATEWAY, PAYMENT_TRANSACTION_REPOSITORY } from './application/ports/tokens.js';
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

// Imports ConsultationModule and DoctorModule to consume their own
// exported use cases (module-to-module calls only through a published
// interface, never another module's repository — docs/10-backend-
// architecture.md Section 11). DoctorModule is a read-only addition
// (GetDoctorProfileByIdUseCase, used only to validate a charge amount
// against the doctor's own consultationFeeAmount) -- docs/10-backend-
// architecture.md's dependency table only forbids PaymentModule from
// depending on ClinicalModule; it does not forbid this read, and the same
// read-only-query-through-a-published-use-case pattern is already used by
// ConsultationModule and ClinicalModule for the same DoctorModule.
// Neither module imports PaymentModule back -- no circular imports, no
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
  imports: [ConsultationModule, DoctorModule, PatientModule, AuthenticationGuardsModule],
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
        getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
        confirmAppointmentUseCase: ConfirmAppointmentUseCase,
        paymentGateway: PaymentGatewayPort,
      ) =>
        new InitiateChargeUseCase(
          repository,
          eventDispatcher,
          getConsultationSessionByIdUseCase,
          getAppointmentByIdUseCase,
          getDoctorProfileByIdUseCase,
          confirmAppointmentUseCase,
          paymentGateway,
        ),
      inject: [
        PAYMENT_TRANSACTION_REPOSITORY,
        DOMAIN_EVENT_DISPATCHER,
        GetConsultationSessionByIdUseCase,
        GetAppointmentByIdUseCase,
        GetDoctorProfileByIdUseCase,
        ConfirmAppointmentUseCase,
        PAYMENT_GATEWAY,
      ],
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
  ],
  exports: [GetPaymentTransactionByIdUseCase, InitiateChargeUseCase, RefundPaymentUseCase],
})
export class PaymentModule {}
