import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetAppointmentByIdUseCase } from '../../application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { CloseConsultationCommand } from '../../application/use-cases/close-consultation/close-consultation.command.js';
import { CloseConsultationUseCase } from '../../application/use-cases/close-consultation/close-consultation.use-case.js';
import { StartConsultationCommand } from '../../application/use-cases/start-consultation/start-consultation.command.js';
import { StartConsultationUseCase } from '../../application/use-cases/start-consultation/start-consultation.use-case.js';
import { CloseConsultationRequestDto } from '../dto/close-consultation-request.dto.js';
import { ConsultationSessionResponseDto } from '../dto/consultation-session-response.dto.js';
import { mapConsultationError } from '../mappers/consultation-exception.mapper.js';

// Matches docs/12-openapi.md's /consultations/{id}/start and
// /consultations/{id}/close exactly. Only the doctor running the
// consultation may start/close it -- gated to AccountRole.Doctor plus an
// ownership check against the session's underlying appointment.
@Controller('consultations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Doctor)
export class ConsultationController {
  constructor(
    private readonly startConsultationUseCase: StartConsultationUseCase,
    private readonly closeConsultationUseCase: CloseConsultationUseCase,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  async start(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<ConsultationSessionResponseDto>> {
    try {
      await this.ensureOwnedByCaller(id, user);
      const session = await this.startConsultationUseCase.execute(
        new StartConsultationCommand({ consultationSessionId: id }),
      );
      return envelope(ConsultationSessionResponseDto.fromDomain(session));
    } catch (error) {
      throw mapConsultationError(error);
    }
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  async close(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CloseConsultationRequestDto,
  ): Promise<ResponseEnvelope<ConsultationSessionResponseDto>> {
    try {
      await this.ensureOwnedByCaller(id, user);
      const session = await this.closeConsultationUseCase.execute(
        new CloseConsultationCommand({ consultationSessionId: id, completionReason: body.completionReason }),
      );
      return envelope(ConsultationSessionResponseDto.fromDomain(session));
    } catch (error) {
      throw mapConsultationError(error);
    }
  }

  private async ensureOwnedByCaller(consultationSessionId: string, user: AccessTokenClaims): Promise<void> {
    const session = await this.getConsultationSessionByIdUseCase.execute({ consultationSessionId });
    if (!session) {
      throw new NotFoundError(`Consultation session "${consultationSessionId}" not found.`);
    }
    const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: session.getAppointmentId() });
    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!appointment || !doctorProfile || appointment.getDoctorId() !== doctorProfile.getId()) {
      throw new NotFoundError(`Consultation session "${consultationSessionId}" not found.`);
    }
  }
}
