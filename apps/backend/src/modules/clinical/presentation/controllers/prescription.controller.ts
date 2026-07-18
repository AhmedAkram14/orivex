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
import type { Prescription } from '../../domain/entities/prescription.entity.js';
import { PrescriptionResponseDto } from '../dto/prescription-response.dto.js';
import { SignPrescriptionRequestDto } from '../dto/sign-prescription-request.dto.js';
import { mapClinicalError } from '../mappers/clinical-exception.mapper.js';

// Matches docs/12-openapi.md's POST /prescriptions (signPrescription) and
// GET /prescriptions/{id} (getPrescription) exactly.
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
