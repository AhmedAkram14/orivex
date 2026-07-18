import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { InitiateChargeCommand } from '../../application/use-cases/initiate-charge/initiate-charge.command.js';
import { InitiateChargeUseCase } from '../../application/use-cases/initiate-charge/initiate-charge.use-case.js';
import { InitiateChargeRequestDto } from '../dto/initiate-charge-request.dto.js';
import { PaymentTransactionResponseDto } from '../dto/payment-transaction-response.dto.js';
import { mapPaymentError } from '../mappers/payment-exception.mapper.js';

// Matches docs/12-openapi.md's POST /payments (initiateCharge) exactly.
// No GET /payments/{id} is documented, so none is built. Gated to
// AccountRole.Patient plus an ownership check that the caller is the
// consultation's actual patient -- the use case itself already pins the
// charge amount to the doctor's real fee, but never verified who was
// paying.
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Patient)
export class PaymentController {
  constructor(
    private readonly initiateChargeUseCase: InitiateChargeUseCase,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  // Tighter than the global 100/min default -- a financial-charge endpoint
  // has no legitimate reason to be called more than a handful of times a
  // minute per account, and idempotency (initiate-charge.use-case.ts) already
  // handles legitimate retries within that budget.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async initiateCharge(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: InitiateChargeRequestDto,
  ): Promise<ResponseEnvelope<PaymentTransactionResponseDto>> {
    try {
      await this.ensureOwnedByCaller(body.consultationSessionId, user);
      const transaction = await this.initiateChargeUseCase.execute(
        new InitiateChargeCommand({
          idempotencyKey: body.idempotencyKey,
          consultationSessionId: body.consultationSessionId,
          amount: body.amount.amount,
          currency: body.amount.currency,
          paymentMethod: body.paymentMethod,
        }),
      );
      return envelope(PaymentTransactionResponseDto.fromDomain(transaction));
    } catch (error) {
      throw mapPaymentError(error);
    }
  }

  private async ensureOwnedByCaller(consultationSessionId: string, user: AccessTokenClaims): Promise<void> {
    const session = await this.getConsultationSessionByIdUseCase.execute({ consultationSessionId });
    if (!session) {
      throw new NotFoundError(`ConsultationSession "${consultationSessionId}" not found.`);
    }
    const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: session.getAppointmentId() });
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!appointment || !patientProfile || appointment.getPatientId() !== patientProfile.getId()) {
      throw new NotFoundError(`ConsultationSession "${consultationSessionId}" not found.`);
    }
  }
}
