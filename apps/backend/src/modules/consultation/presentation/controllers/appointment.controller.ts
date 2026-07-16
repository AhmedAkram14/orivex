import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import type { Account } from '../../../identity/domain/entities/account.entity.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';
import { BookAppointmentCommand } from '../../application/use-cases/book-appointment/book-appointment.command.js';
import { BookAppointmentUseCase } from '../../application/use-cases/book-appointment/book-appointment.use-case.js';
import { ListAppointmentsForPatientUseCase } from '../../application/use-cases/list-appointments-for-patient/list-appointments-for-patient.use-case.js';
import { RescheduleOrCancelAppointmentCommand } from '../../application/use-cases/reschedule-or-cancel-appointment/reschedule-or-cancel-appointment.command.js';
import { RescheduleOrCancelAppointmentUseCase } from '../../application/use-cases/reschedule-or-cancel-appointment/reschedule-or-cancel-appointment.use-case.js';
import { AppointmentListItemResponseDto } from '../dto/appointment-list-item-response.dto.js';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import { BookAppointmentRequestDto } from '../dto/book-appointment-request.dto.js';
import { RescheduleOrCancelAppointmentRequestDto } from '../dto/reschedule-or-cancel-appointment-request.dto.js';
import { mapConsultationError } from '../mappers/consultation-exception.mapper.js';

// Matches docs/12-openapi.md's POST /appointments and PATCH /appointments/{id}
// exactly, plus this module's own additive GET /appointments/me (Vertical
// Slice Development directive) -- the caller's own appointment list, scoped
// via the JWT rather than a query param (never another patient's data). The
// full paginated/filterable listAppointments contract is still deliberately
// not built -- this is just "my own list," matching PatientProfileController's
// /patients/me precedent.
@Controller('appointments')
export class AppointmentController {
  constructor(
    private readonly bookAppointmentUseCase: BookAppointmentUseCase,
    private readonly rescheduleOrCancelAppointmentUseCase: RescheduleOrCancelAppointmentUseCase,
    private readonly listAppointmentsForPatientUseCase: ListAppointmentsForPatientUseCase,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async book(@Body() body: BookAppointmentRequestDto): Promise<ResponseEnvelope<AppointmentResponseDto>> {
    try {
      const appointment = await this.bookAppointmentUseCase.execute(
        new BookAppointmentCommand({
          patientId: body.patientId,
          doctorId: body.doctorId,
          availabilityWindowId: body.availabilityWindowId,
          consultationType: body.consultationType,
          reasonForVisit: body.reasonForVisit,
        }),
      );
      return envelope(AppointmentResponseDto.fromDomain(appointment));
    } catch (error) {
      throw mapConsultationError(error);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Patient)
  async listMyAppointments(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<AppointmentListItemResponseDto[]>> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!patientProfile) {
      // No profile yet means no appointment could ever have been booked --
      // an honest empty list, not an error.
      return envelope([]);
    }

    const appointments = await this.listAppointmentsForPatientUseCase.execute({ patientId: patientProfile.getId() });
    const items = await Promise.all(appointments.map((appointment) => this.toListItem(appointment)));

    return envelope(items.filter((item): item is AppointmentListItemResponseDto => item !== null));
  }

  @Patch(':id')
  async rescheduleOrCancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RescheduleOrCancelAppointmentRequestDto,
  ): Promise<ResponseEnvelope<AppointmentResponseDto>> {
    try {
      const appointment = await this.rescheduleOrCancelAppointmentUseCase.execute(
        new RescheduleOrCancelAppointmentCommand({
          appointmentId: id,
          action: body.action,
          newAvailabilityWindowId: body.newAvailabilityWindowId,
        }),
      );
      return envelope(AppointmentResponseDto.fromDomain(appointment));
    } catch (error) {
      throw mapConsultationError(error);
    }
  }

  private async toListItem(appointment: Appointment): Promise<AppointmentListItemResponseDto | null> {
    const doctorProfile: DoctorProfile | null = await this.getDoctorProfileByIdUseCase.execute({
      doctorProfileId: appointment.getDoctorId(),
    });
    if (!doctorProfile) {
      return null;
    }
    const doctorAccount: Account | null = await this.getAccountByIdUseCase.execute({
      accountId: doctorProfile.getAccountId(),
    });
    if (!doctorAccount) {
      return null;
    }
    return AppointmentListItemResponseDto.fromDomain(appointment, doctorProfile, doctorAccount);
  }
}
