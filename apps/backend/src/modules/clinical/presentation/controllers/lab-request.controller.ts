import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { RecordAuditLogCommand } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.command.js';
import { RecordAuditLogUseCase } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.use-case.js';
import { AuditAction } from '../../../trust/domain/enums/audit-action.enum.js';
import { GetLabRequestByIdUseCase } from '../../application/use-cases/get-lab-request-by-id/get-lab-request-by-id.use-case.js';
import { RecordLabRequestCommand } from '../../application/use-cases/record-lab-request/record-lab-request.command.js';
import { RecordLabRequestUseCase } from '../../application/use-cases/record-lab-request/record-lab-request.use-case.js';
import type { LabRequest } from '../../domain/entities/lab-request.entity.js';
import { LabRequestResponseDto } from '../dto/lab-request-response.dto.js';
import { RecordLabRequestRequestDto } from '../dto/record-lab-request-request.dto.js';
import { mapClinicalError } from '../mappers/clinical-exception.mapper.js';

// I1 -- Lab Requests. Mirrors PrescriptionController exactly: doctor
// authors, either party may read their own, ownership checked in-handler
// since no single @Roles() fits GET.
@Controller('lab-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LabRequestController {
  constructor(
    private readonly recordLabRequestUseCase: RecordLabRequestUseCase,
    private readonly getLabRequestByIdUseCase: GetLabRequestByIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly recordAuditLogUseCase: RecordAuditLogUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(AccountRole.Doctor)
  async record(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: RecordLabRequestRequestDto,
  ): Promise<ResponseEnvelope<LabRequestResponseDto>> {
    try {
      const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
      if (!doctorProfile) {
        throw new NotFoundError('No doctor profile exists for this account.');
      }
      const labRequest = await this.recordLabRequestUseCase.execute(
        new RecordLabRequestCommand({
          consultationSessionId: body.consultationSessionId,
          authoringDoctorId: doctorProfile.getId(),
          testName: body.testName,
          clinicalReason: body.clinicalReason,
          instructions: body.instructions,
        }),
      );
      await this.recordAuditLogUseCase.execute(
        new RecordAuditLogCommand({
          actorAccountId: user.accountId,
          actorRole: user.role,
          action: AuditAction.LabRequestOrdered,
          subjectType: 'consultation_session',
          subjectId: body.consultationSessionId,
          metadata: { labRequestId: labRequest.getId() },
        }),
      );
      return envelope(LabRequestResponseDto.fromDomain(labRequest));
    } catch (error) {
      throw mapClinicalError(error);
    }
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<LabRequestResponseDto>> {
    try {
      const labRequest = await this.getLabRequestByIdUseCase.execute({ labRequestId: id });
      if (!labRequest || !(await this.isOwnedByCaller(labRequest, user))) {
        throw new NotFoundError(`LabRequest "${id}" not found.`);
      }
      return envelope(LabRequestResponseDto.fromDomain(labRequest));
    } catch (error) {
      throw mapClinicalError(error);
    }
  }

  private async isOwnedByCaller(labRequest: LabRequest, user: AccessTokenClaims): Promise<boolean> {
    if (user.role === AccountRole.Doctor) {
      const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
      return doctorProfile !== null && doctorProfile.getId() === labRequest.getAuthoringDoctorId();
    }
    if (user.role === AccountRole.Patient) {
      const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
      if (!patientProfile) {
        return false;
      }
      const session = await this.getConsultationSessionByIdUseCase.execute({
        consultationSessionId: labRequest.getConsultationSessionId(),
      });
      if (!session) {
        return false;
      }
      const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: session.getAppointmentId() });
      return appointment !== null && appointment.getPatientId() === patientProfile.getId();
    }
    return false;
  }
}
