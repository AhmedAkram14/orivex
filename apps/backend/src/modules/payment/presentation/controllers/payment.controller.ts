import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { RequiresIdentityVerification } from '../../../trust/presentation/decorators/requires-identity-verification.decorator.js';
import { RequiresIdentityVerificationGuard } from '../../../trust/presentation/guards/requires-identity-verification.guard.js';
import { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { GetPaymentTransactionByConsultationSessionIdUseCase } from '../../application/use-cases/get-payment-transaction-by-consultation-session-id/get-payment-transaction-by-consultation-session-id.use-case.js';
import { GetPaymentTransactionByIdUseCase } from '../../application/use-cases/get-payment-transaction-by-id/get-payment-transaction-by-id.use-case.js';
import { InitiateChargeCommand } from '../../application/use-cases/initiate-charge/initiate-charge.command.js';
import { InitiateChargeUseCase } from '../../application/use-cases/initiate-charge/initiate-charge.use-case.js';
import { RefundPaymentCommand } from '../../application/use-cases/refund-payment/refund-payment.command.js';
import { RefundPaymentUseCase } from '../../application/use-cases/refund-payment/refund-payment.use-case.js';
import type { PaymentTransaction } from '../../domain/entities/payment-transaction.entity.js';
import { InitiateChargeRequestDto } from '../dto/initiate-charge-request.dto.js';
import { PaymentTransactionResponseDto } from '../dto/payment-transaction-response.dto.js';
import { mapPaymentError } from '../mappers/payment-exception.mapper.js';

// Matches docs/12-openapi.md's POST /payments (initiateCharge). GET /:id and
// POST /:id/refund are additive (ORIVEX Roadmap 2.0 implementation program,
// Stage 1) -- both re-derive ownership from the transaction's own
// patientId/doctorId rather than trusting a caller-supplied id, same "never
// leak existence to a non-owner" 404 pattern used across this codebase.
// The Stripe webhook receiver is a separate, unguarded controller
// (payment-webhook.controller.ts) -- signature verification replaces
// JwtAuthGuard there, so it cannot share this controller's guard stack.
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Patient)
export class PaymentController {
  constructor(
    private readonly initiateChargeUseCase: InitiateChargeUseCase,
    private readonly getPaymentTransactionByIdUseCase: GetPaymentTransactionByIdUseCase,
    private readonly getPaymentTransactionByConsultationSessionIdUseCase: GetPaymentTransactionByConsultationSessionIdUseCase,
    private readonly refundPaymentUseCase: RefundPaymentUseCase,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RequiresIdentityVerificationGuard)
  @RequiresIdentityVerification()
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
      await this.ensureAppointmentOwnedByCaller(body.appointmentId, user);
      const transaction = await this.initiateChargeUseCase.execute(
        new InitiateChargeCommand({
          idempotencyKey: body.idempotencyKey,
          appointmentId: body.appointmentId,
          amount: body.amount.amount,
          currency: body.amount.currency,
          paymentMethod: body.paymentMethod,
          paymentMethodToken: body.paymentMethodToken,
        }),
      );
      return envelope(PaymentTransactionResponseDto.fromDomain(transaction));
    } catch (error) {
      throw mapPaymentError(error);
    }
  }

  // Doctor-only lookup letting the frontend discover a refundable
  // transaction id from a consultation session it already has (e.g. the
  // Doctor Queue's real sessionId), without exposing a raw
  // list/search-by-patient endpoint. Registered before ':id' so Nest's
  // route matching never treats "by-consultation-session" as an :id value.
  @Get('by-consultation-session/:consultationSessionId')
  @Roles(AccountRole.Doctor)
  async getByConsultationSessionId(
    @CurrentUser() user: AccessTokenClaims,
    @Param('consultationSessionId', ParseUUIDPipe) consultationSessionId: string,
  ): Promise<ResponseEnvelope<PaymentTransactionResponseDto | null>> {
    const session = await this.getConsultationSessionByIdUseCase.execute({ consultationSessionId });
    if (!session) {
      throw new NotFoundError(`ConsultationSession "${consultationSessionId}" not found.`);
    }
    const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: session.getAppointmentId() });
    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!appointment || !doctorProfile || appointment.getDoctorId() !== doctorProfile.getId()) {
      throw new NotFoundError(`ConsultationSession "${consultationSessionId}" not found.`);
    }

    const transaction = await this.getPaymentTransactionByConsultationSessionIdUseCase.execute({ consultationSessionId });
    return envelope(transaction ? PaymentTransactionResponseDto.fromDomain(transaction) : null);
  }

  @Get(':id')
  @Roles(AccountRole.Patient, AccountRole.Doctor)
  async getById(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<PaymentTransactionResponseDto>> {
    const transaction = await this.getPaymentTransactionByIdUseCase.execute({ paymentTransactionId: id });
    if (!transaction || !(await this.isOwnedByCaller(transaction, user))) {
      throw new NotFoundError(`PaymentTransaction "${id}" not found.`);
    }
    return envelope(PaymentTransactionResponseDto.fromDomain(transaction));
  }

  // Refund decisions belong to the treating doctor -- there is no admin
  // role wired into any other payment-adjacent flow yet, so this
  // deliberately doesn't introduce one just for refunds.
  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @Roles(AccountRole.Doctor)
  async refund(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<PaymentTransactionResponseDto>> {
    try {
      const existing = await this.getPaymentTransactionByIdUseCase.execute({ paymentTransactionId: id });
      if (!existing || !(await this.isOwnedByCaller(existing, user))) {
        throw new NotFoundError(`PaymentTransaction "${id}" not found.`);
      }
      const transaction = await this.refundPaymentUseCase.execute(new RefundPaymentCommand({ paymentTransactionId: id }));
      return envelope(PaymentTransactionResponseDto.fromDomain(transaction));
    } catch (error) {
      throw mapPaymentError(error);
    }
  }

  private async ensureAppointmentOwnedByCaller(appointmentId: string, user: AccessTokenClaims): Promise<void> {
    const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId });
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!appointment || !patientProfile || appointment.getPatientId() !== patientProfile.getId()) {
      // 404, not 403 -- never confirms to a caller whether an appointment
      // id belonging to someone else exists at all.
      throw new NotFoundError(`Appointment "${appointmentId}" not found.`);
    }
  }

  private async isOwnedByCaller(transaction: PaymentTransaction, user: AccessTokenClaims): Promise<boolean> {
    if (user.role === AccountRole.Patient) {
      const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
      return patientProfile !== null && patientProfile.getId() === transaction.getPatientId();
    }
    if (user.role === AccountRole.Doctor) {
      const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
      return doctorProfile !== null && doctorProfile.getId() === transaction.getDoctorId();
    }
    return false;
  }
}
