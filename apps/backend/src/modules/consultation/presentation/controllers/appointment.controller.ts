import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { RequiresIdentityVerification } from '../../../trust/presentation/decorators/requires-identity-verification.decorator.js';
import { RequiresIdentityVerificationGuard } from '../../../trust/presentation/guards/requires-identity-verification.guard.js';
import type { Account } from '../../../identity/domain/entities/account.entity.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { PaginationQueryDto } from '../../../../shared/http/pagination-query.dto.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';
import { BookAppointmentCommand } from '../../application/use-cases/book-appointment/book-appointment.command.js';
import { BookAppointmentUseCase } from '../../application/use-cases/book-appointment/book-appointment.use-case.js';
import { GetAppointmentByIdUseCase } from '../../application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByAppointmentIdUseCase } from '../../application/use-cases/get-consultation-session-by-appointment-id/get-consultation-session-by-appointment-id.use-case.js';
import { ListAppointmentsForPatientPageUseCase } from '../../application/use-cases/list-appointments-for-patient-page/list-appointments-for-patient-page.use-case.js';
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
//
// Doctor-scoped dashboard/upcoming-work/queue routes live on
// DoctorAppointmentsController (Production Readiness Audit -- "split
// oversized controllers") -- same `appointments` path prefix, so the public
// contract is unchanged.
@Controller('appointments')
export class AppointmentController {
  constructor(
    private readonly bookAppointmentUseCase: BookAppointmentUseCase,
    private readonly rescheduleOrCancelAppointmentUseCase: RescheduleOrCancelAppointmentUseCase,
    private readonly listAppointmentsForPatientPageUseCase: ListAppointmentsForPatientPageUseCase,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getConsultationSessionByAppointmentIdUseCase: GetConsultationSessionByAppointmentIdUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard, RequiresIdentityVerificationGuard)
  @Roles(AccountRole.Patient)
  @RequiresIdentityVerification()
  // Tighter than the global 100/min default -- prevents a single account
  // from hammering slot-availability contention (booking retries) or
  // spamming doctors with requests.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async book(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: BookAppointmentRequestDto,
  ): Promise<ResponseEnvelope<AppointmentResponseDto>> {
    try {
      const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
      if (!patientProfile) {
        throw new NotFoundError('No patient profile exists for this account.');
      }
      const appointment = await this.bookAppointmentUseCase.execute(
        new BookAppointmentCommand({
          patientId: patientProfile.getId(),
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
    @Query() query: PaginationQueryDto,
  ): Promise<ResponseEnvelope<AppointmentListItemResponseDto[]>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!patientProfile) {
      // No profile yet means no appointment could ever have been booked --
      // an honest empty list, not an error.
      return envelope([], { page, limit, total: 0 });
    }

    const { items: appointments, total } = await this.listAppointmentsForPatientPageUseCase.execute({
      patientId: patientProfile.getId(),
      page,
      limit,
    });
    const items = await Promise.all(appointments.map((appointment) => this.toListItem(appointment)));

    return envelope(items.filter((item): item is AppointmentListItemResponseDto => item !== null), {
      page,
      limit,
      total,
    });
  }

  // Either the owning patient or the owning doctor may reschedule/cancel --
  // no single @Roles() fits, so ownership is checked in-handler against
  // whichever profile matches the caller's role (mirrors the "never leak
  // existence to a non-owner" 404 pattern used across this codebase).
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async rescheduleOrCancel(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RescheduleOrCancelAppointmentRequestDto,
  ): Promise<ResponseEnvelope<AppointmentResponseDto>> {
    try {
      const existing = await this.getAppointmentByIdUseCase.execute({ appointmentId: id });
      if (!existing || !(await this.isOwnedByCaller(existing, user))) {
        throw new NotFoundError(`Appointment "${id}" not found.`);
      }
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

  private async isOwnedByCaller(appointment: Appointment, user: AccessTokenClaims): Promise<boolean> {
    if (user.role === AccountRole.Patient) {
      const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
      return patientProfile !== null && patientProfile.getId() === appointment.getPatientId();
    }
    if (user.role === AccountRole.Doctor) {
      const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
      return doctorProfile !== null && doctorProfile.getId() === appointment.getDoctorId();
    }
    return false;
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
    const session = await this.getConsultationSessionByAppointmentIdUseCase.execute({
      appointmentId: appointment.getId(),
    });
    return AppointmentListItemResponseDto.fromDomain(appointment, doctorProfile, doctorAccount, session?.getId() ?? null);
  }
}
