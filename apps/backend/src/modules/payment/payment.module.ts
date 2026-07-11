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
import { PrismaPaymentTransactionRepository } from './infrastructure/prisma/prisma-payment-transaction.repository.js';
import { PaymentController } from './presentation/controllers/payment.controller.js';

// Imports ConsultationModule to consume its own exported use cases
// (module-to-module calls only through a published interface, never
// another module's repository — docs/10-backend-architecture.md Section
// 11). ConsultationModule remains completely unaware PaymentModule exists
// -- no circular imports, no forwardRef().
//
// IMPORTANT: this module is NOT registered in AppModule.imports yet.
// InitiateChargeUseCase has a real, required dependency on
// PaymentGatewayPort (the documented "external PSP adapter") -- per
// architect direction, no concrete adapter or fake is implemented and no
// provider is registered for PAYMENT_GATEWAY. Wiring this module into the
// running application would make Nest fail to resolve that token at boot,
// which would violate the "app must boot cleanly (only P1001 acceptable)"
// verification standard used for every module so far. The honest
// resolution is to keep the dependency explicit in code (not fabricated)
// while leaving the module out of the live app graph until a specific PSP
// is chosen and a real adapter is bound to PAYMENT_GATEWAY -- at which
// point this module registers exactly like every other one.
@Module({
  imports: [ConsultationModule],
  controllers: [PaymentController],
  providers: [
    { provide: PAYMENT_TRANSACTION_REPOSITORY, useClass: PrismaPaymentTransactionRepository },
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
