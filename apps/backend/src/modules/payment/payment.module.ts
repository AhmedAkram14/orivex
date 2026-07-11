import { Module } from '@nestjs/common';

import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { ConfirmAppointmentUseCase } from '../consultation/application/use-cases/confirm-appointment/confirm-appointment.use-case.js';
import { GetAppointmentByIdUseCase } from '../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { ConsultationModule } from '../consultation/consultation.module.js';

import type { PaymentGatewayPort } from './application/ports/payment-gateway.port.js';
import { PAYMENT_GATEWAY, PAYMENT_TRANSACTION_REPOSITORY } from './application/ports/tokens.js';
import { GetPaymentTransactionByIdUseCase } from './application/use-cases/get-payment-transaction-by-id/get-payment-transaction-by-id.use-case.js';
import { InitiateChargeUseCase } from './application/use-cases/initiate-charge/initiate-charge.use-case.js';
import type { PaymentTransactionRepository } from './domain/repositories/payment-transaction.repository.js';
import { NotConfiguredPaymentGatewayAdapter } from './infrastructure/gateway/not-configured-payment-gateway.adapter.js';
import { PrismaPaymentTransactionRepository } from './infrastructure/prisma/prisma-payment-transaction.repository.js';
import { PaymentController } from './presentation/controllers/payment.controller.js';

// Imports ConsultationModule to consume its own exported use cases
// (module-to-module calls only through a published interface, never
// another module's repository — docs/10-backend-architecture.md Section
// 11). ConsultationModule remains completely unaware PaymentModule exists
// -- no circular imports, no forwardRef().
//
// PAYMENT_GATEWAY is bound to NotConfiguredPaymentGatewayAdapter -- no PSP
// has been selected yet, but the module stays fully registered (architect
// direction: "do not leave finished modules disconnected from AppModule").
// Dependency inversion stays intact; the missing dependency is explicit;
// the app boots cleanly; only an actual initiateCharge call fails, with a
// clear error naming exactly what's missing. Swap this binding for a real
// adapter the moment a PSP is chosen -- nothing else changes.
@Module({
  imports: [ConsultationModule],
  controllers: [PaymentController],
  providers: [
    { provide: PAYMENT_TRANSACTION_REPOSITORY, useClass: PrismaPaymentTransactionRepository },
    { provide: PAYMENT_GATEWAY, useClass: NotConfiguredPaymentGatewayAdapter },
    {
      provide: GetPaymentTransactionByIdUseCase,
      useFactory: (repository: PaymentTransactionRepository) => new GetPaymentTransactionByIdUseCase(repository),
      inject: [PAYMENT_TRANSACTION_REPOSITORY],
    },
    {
      provide: InitiateChargeUseCase,
      useFactory: (
        repository: PaymentTransactionRepository,
        eventDispatcher: DomainEventDispatcher,
        getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        confirmAppointmentUseCase: ConfirmAppointmentUseCase,
        paymentGateway: PaymentGatewayPort,
      ) =>
        new InitiateChargeUseCase(
          repository,
          eventDispatcher,
          getConsultationSessionByIdUseCase,
          getAppointmentByIdUseCase,
          confirmAppointmentUseCase,
          paymentGateway,
        ),
      inject: [
        PAYMENT_TRANSACTION_REPOSITORY,
        DOMAIN_EVENT_DISPATCHER,
        GetConsultationSessionByIdUseCase,
        GetAppointmentByIdUseCase,
        ConfirmAppointmentUseCase,
        PAYMENT_GATEWAY,
      ],
    },
  ],
  exports: [GetPaymentTransactionByIdUseCase, InitiateChargeUseCase],
})
export class PaymentModule {}
