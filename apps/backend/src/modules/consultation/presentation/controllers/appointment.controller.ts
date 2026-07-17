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
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetSchedulingRulesUseCase } from '../../../scheduling/application/use-cases/get-scheduling-rules/get-scheduling-rules.use-case.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../domain/enums/appointment-status.enum.js';
import { BookAppointmentCommand } from '../../application/use-cases/book-appointment/book-appointment.command.js';
import { BookAppointmentUseCase } from '../../application/use-cases/book-appointment/book-appointment.use-case.js';
import { GetConsultationSessionByAppointmentIdUseCase } from '../../application/use-cases/get-consultation-session-by-appointment-id/get-consultation-session-by-appointment-id.use-case.js';
import { ListAppointmentsForPatientUseCase } from '../../application/use-cases/list-appointments-for-patient/list-appointments-for-patient.use-case.js';
import { ListAppointmentsForDoctorUseCase } from '../../application/use-cases/list-appointments-for-doctor/list-appointments-for-doctor.use-case.js';
import { RescheduleOrCancelAppointmentCommand } from '../../application/use-cases/reschedule-or-cancel-appointment/reschedule-or-cancel-appointment.command.js';
import { RescheduleOrCancelAppointmentUseCase } from '../../application/use-cases/reschedule-or-cancel-appointment/reschedule-or-cancel-appointment.use-case.js';
import { AppointmentListItemResponseDto } from '../dto/appointment-list-item-response.dto.js';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import { BookAppointmentRequestDto } from '../dto/book-appointment-request.dto.js';
import { RescheduleOrCancelAppointmentRequestDto } from '../dto/reschedule-or-cancel-appointment-request.dto.js';
import { DoctorDashboardSummaryResponseDto } from '../dto/doctor-dashboard-summary-response.dto.js';
import { DoctorUpcomingWorkItemResponseDto } from '../dto/doctor-upcoming-work-item-response.dto.js';
import { QueueEntryResponseDto } from '../dto/queue-entry-response.dto.js';
import { mapConsultationError } from '../mappers/consultation-exception.mapper.js';
import { toQueueStatus } from '../mappers/queue-status.mapper.js';
import { toUpcomingWorkStatus } from '../mappers/upcoming-work-status.mapper.js';

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
    private readonly listAppointmentsForDoctorUseCase: ListAppointmentsForDoctorUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getConsultationSessionByAppointmentIdUseCase: GetConsultationSessionByAppointmentIdUseCase,
    private readonly getSchedulingRulesUseCase: GetSchedulingRulesUseCase,
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

  // Doctor-scoped dashboard counts (Doctor Workspace's "Today's Summary").
  // `patientsInQueue` is deliberately a proxy -- "Confirmed today" -- since
  // no live check-in/queue system exists yet; documented honestly rather
  // than implying real-time queue tracking.
  @Get('doctor/dashboard-summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Doctor)
  async getDoctorDashboardSummary(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<DoctorDashboardSummaryResponseDto>> {
    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!doctorProfile) {
      // No profile yet means no appointment could ever have been booked --
      // an honest empty summary, not an error.
      const empty = new DoctorDashboardSummaryResponseDto();
      empty.consultationsToday = 0;
      empty.patientsInQueue = 0;
      empty.completedToday = 0;
      return envelope(empty);
    }

    const appointments = await this.listAppointmentsForDoctorUseCase.execute({ doctorId: doctorProfile.getId() });
    const todaysAppointments = appointments.filter((appointment) => isSameUtcDay(appointment.getScheduledAt(), new Date()));

    const dto = new DoctorDashboardSummaryResponseDto();
    dto.consultationsToday = todaysAppointments.filter((appointment) =>
      [AppointmentStatus.Requested, AppointmentStatus.Confirmed, AppointmentStatus.Rescheduled].includes(
        appointment.getStatus(),
      ),
    ).length;
    // A reasonable proxy for "checked in and waiting" -- Confirmed today --
    // there is no live queue/check-in system to report from.
    dto.patientsInQueue = todaysAppointments.filter(
      (appointment) => appointment.getStatus() === AppointmentStatus.Confirmed,
    ).length;
    dto.completedToday = todaysAppointments.filter(
      (appointment) => appointment.getStatus() === AppointmentStatus.Completed,
    ).length;

    return envelope(dto);
  }

  // Doctor-scoped "what's coming up" list (Doctor Workspace's "Upcoming Work
  // Area"). Excludes Completed/Cancelled/NoShow appointments -- a dashboard
  // "upcoming work" view should show what's still ahead, not terminal noise.
  @Get('doctor/upcoming-work')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Doctor)
  async getDoctorUpcomingWork(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<DoctorUpcomingWorkItemResponseDto[]>> {
    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!doctorProfile) {
      return envelope([]);
    }

    const appointments = await this.listAppointmentsForDoctorUseCase.execute({ doctorId: doctorProfile.getId() });
    const upcoming = appointments.filter(
      (appointment) =>
        appointment.getStatus() !== AppointmentStatus.Completed &&
        appointment.getStatus() !== AppointmentStatus.Cancelled &&
        appointment.getStatus() !== AppointmentStatus.NoShow,
    );

    const items = await Promise.all(upcoming.map((appointment) => this.toUpcomingWorkItem(appointment)));

    return envelope(items.filter((item): item is DoctorUpcomingWorkItemResponseDto => item !== null));
  }

  // Doctor-scoped Patient Queue (Doctor Workspace's "Patient Queue" page).
  // Today's appointments that have progressed past confirmation (only
  // Confirmed/Completed appointments ever get a ConsultationSession --
  // ConfirmAppointmentUseCase opens one in WaitingRoom the moment an
  // appointment is confirmed), mapped from the session's real state.
  @Get('doctor/queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Doctor)
  async getDoctorQueue(@CurrentUser() user: AccessTokenClaims): Promise<ResponseEnvelope<QueueEntryResponseDto[]>> {
    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!doctorProfile) {
      return envelope([]);
    }

    const appointments = await this.listAppointmentsForDoctorUseCase.execute({ doctorId: doctorProfile.getId() });
    const todaysQueueable = appointments
      .filter((appointment) => isSameUtcDay(appointment.getScheduledAt(), new Date()))
      .filter(
        (appointment) =>
          appointment.getStatus() === AppointmentStatus.Confirmed ||
          appointment.getStatus() === AppointmentStatus.Completed,
      )
      .sort((a, b) => a.getScheduledAt().getTime() - b.getScheduledAt().getTime());

    const rules = await this.getSchedulingRulesUseCase.execute();
    const views = await Promise.all(todaysQueueable.map((appointment) => this.toQueueView(appointment)));
    const resolved = views.filter((view): view is QueueView => view !== null);

    const items = resolved.map((view, index) => {
      const dto = new QueueEntryResponseDto();
      dto.id = view.sessionId;
      dto.label = view.patientName;
      dto.status = view.status;
      dto.position = index + 1;
      if (view.status === 'waiting') {
        dto.estimatedWaitMinutes = index * rules.slotDurationMinutes;
      }
      return dto;
    });

    return envelope(items);
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

  private async toUpcomingWorkItem(appointment: Appointment): Promise<DoctorUpcomingWorkItemResponseDto | null> {
    const patientProfile = await this.getPatientProfileByIdUseCase.execute({
      patientProfileId: appointment.getPatientId(),
    });
    if (!patientProfile) {
      return null;
    }
    const patientAccount: Account | null = await this.getAccountByIdUseCase.execute({
      accountId: patientProfile.getAccountId(),
    });
    if (!patientAccount) {
      return null;
    }

    const dto = new DoctorUpcomingWorkItemResponseDto();
    dto.id = appointment.getId();
    dto.scheduledAt = appointment.getScheduledAt().toISOString();
    dto.title = patientAccount.getUserProfile().getDisplayName().toString();
    dto.description = appointment.getReasonForVisit() ?? undefined;
    dto.status = toUpcomingWorkStatus(appointment.getStatus());
    return dto;
  }

  private async toQueueView(appointment: Appointment): Promise<QueueView | null> {
    const session = await this.getConsultationSessionByAppointmentIdUseCase.execute({
      appointmentId: appointment.getId(),
    });
    if (!session) {
      // Confirmed/Completed should always have one (opened at confirmation
      // time) -- defensive, not an expected path.
      return null;
    }

    const patientProfile = await this.getPatientProfileByIdUseCase.execute({
      patientProfileId: appointment.getPatientId(),
    });
    if (!patientProfile) {
      return null;
    }
    const patientAccount: Account | null = await this.getAccountByIdUseCase.execute({
      accountId: patientProfile.getAccountId(),
    });
    if (!patientAccount) {
      return null;
    }

    return {
      sessionId: session.getId(),
      patientName: patientAccount.getUserProfile().getDisplayName().toString(),
      status: toQueueStatus(session.getState()),
    };
  }
}

interface QueueView {
  sessionId: string;
  patientName: string;
  status: QueueEntryResponseDto['status'];
}

// Same UTC calendar day -- keeps "today" comparison simple and timezone-
// consistent, matching the task's explicit "keep it simple" guidance.
function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}
