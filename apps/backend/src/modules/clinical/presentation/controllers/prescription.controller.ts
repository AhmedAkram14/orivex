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
import { GetPrescriptionByIdUseCase } from '../../application/use-cases/get-prescription-by-id/get-prescription-by-id.use-case.js';
import { SignPrescriptionCommand } from '../../application/use-cases/sign-prescription/sign-prescription.command.js';
import { SignPrescriptionUseCase } from '../../application/use-cases/sign-prescription/sign-prescription.use-case.js';
import { RecordAuditLogCommand } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.command.js';
import { RecordAuditLogUseCase } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.use-case.js';
import { AuditAction } from '../../../trust/domain/enums/audit-action.enum.js';
import type { Prescription } from '../../domain/entities/prescription.entity.js';
import { PrescriptionResponseDto } from '../dto/prescription-response.dto.js';
import { SignPrescriptionRequestDto } from '../dto/sign-prescription-request.dto.js';
import { mapClinicalError } from '../mappers/clinical-exception.mapper.js';

// Matches docs/12-openapi.md's POST /prescriptions (signPrescription) and
// GET /prescriptions/{id} (getPrescription) exactly.
//
// Audit trail gap fix (ORIVEX Remaining Work Audit, P0 C2): sign() records
// an audit row after a successful write, matching every other clinical
// write controller. getById() is deliberately NOT audited here -- it is a
// single, already ownership-scoped record lookup (same tier as a patient
// viewing their own profile), not a broad PHI read across a patient's
// record the way HealthGraphController/DoctorPatientChartController's
// routes are; auditing every such self-service GET would be noise, not
// signal, for the access-control risk C2 exists to cover.
@Controller('prescriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrescriptionController {
  constructor(
    private readonly signPrescriptionUseCase: SignPrescriptionUseCase,
    private readonly getPrescriptionByIdUseCase: GetPrescriptionByIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly recordAuditLogUseCase: RecordAuditLogUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(AccountRole.Doctor)
  async sign(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: SignPrescriptionRequestDto,
  ): Promise<ResponseEnvelope<PrescriptionResponseDto>> {
    try {
      const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
      if (!doctorProfile) {
        throw new NotFoundError('No doctor profile exists for this account.');
      }
      const prescription = await this.signPrescriptionUseCase.execute(
        new SignPrescriptionCommand({
          consultationSessionId: body.consultationSessionId,
          diagnosisNodeId: body.diagnosisNodeId,
          authoringDoctorId: doctorProfile.getId(),
          lineItems: body.lineItems,
        }),
      );
      await this.recordAuditLogUseCase.execute(
        new RecordAuditLogCommand({
          actorAccountId: user.accountId,
          actorRole: user.role,
          action: AuditAction.PrescriptionSigned,
          subjectType: 'consultation_session',
          subjectId: body.consultationSessionId,
          metadata: { prescriptionId: prescription.getId() },
        }),
      );
      return envelope(PrescriptionResponseDto.fromDomain(prescription));
    } catch (error) {
      throw mapClinicalError(error);
    }
  }

  // Either the authoring doctor or the treated patient may read a
  // prescription -- no single @Roles() fits, so ownership is checked
  // in-handler (mirrors the "never leak existence to a non-owner" 404
  // pattern used across this codebase).
  @Get(':id')
  async getById(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<PrescriptionResponseDto>> {
    try {
      const prescription = await this.getPrescriptionByIdUseCase.execute({ prescriptionId: id });
      if (!prescription || !(await this.isOwnedByCaller(prescription, user))) {
        throw new NotFoundError(`Prescription "${id}" not found.`);
      }
      return envelope(PrescriptionResponseDto.fromDomain(prescription));
    } catch (error) {
      throw mapClinicalError(error);
    }
  }

  private async isOwnedByCaller(prescription: Prescription, user: AccessTokenClaims): Promise<boolean> {
    if (user.role === AccountRole.Doctor) {
      const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
      return doctorProfile !== null && doctorProfile.getId() === prescription.getAuthoringDoctorId();
    }
    if (user.role === AccountRole.Patient) {
      const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
      if (!patientProfile) {
        return false;
      }
      const session = await this.getConsultationSessionByIdUseCase.execute({
        consultationSessionId: prescription.getConsultationSessionId(),
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
