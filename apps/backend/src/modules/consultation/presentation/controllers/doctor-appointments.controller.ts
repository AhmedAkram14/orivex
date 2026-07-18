import { Controller, Get, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import type { Account } from '../../../identity/domain/entities/account.entity.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetSchedulingRulesUseCase } from '../../../scheduling/application/use-cases/get-scheduling-rules/get-scheduling-rules.use-case.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../domain/enums/appointment-status.enum.js';
import { GetConsultationSessionByAppointmentIdUseCase } from '../../application/use-cases/get-consultation-session-by-appointment-id/get-consultation-session-by-appointment-id.use-case.js';
import { ListAppointmentsForDoctorUseCase } from '../../application/use-cases/list-appointments-for-doctor/list-appointments-for-doctor.use-case.js';
import { DoctorDashboardSummaryResponseDto } from '../dto/doctor-dashboard-summary-response.dto.js';
import { DoctorUpcomingWorkItemResponseDto } from '../dto/doctor-upcoming-work-item-response.dto.js';
import { QueueEntryResponseDto } from '../dto/queue-entry-response.dto.js';
import { toQueueStatus } from '../mappers/queue-status.mapper.js';
import { toUpcomingWorkStatus } from '../mappers/upcoming-work-status.mapper.js';

// Split out of AppointmentController (Production Readiness Audit -- "split
// oversized controllers") -- every route here is doctor-scoped dashboard
// aggregation, a self-contained slice distinct from the patient-facing
// book/list/reschedule routes that remain on AppointmentController. Same
// `appointments` path prefix, so the public contract (GET
// /appointments/doctor/*) is unchanged.
@Controller('appointments')
export class DoctorAppointmentsController {
  constructor(
    private readonly listAppointmentsForDoctorUseCase: ListAppointmentsForDoctorUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getConsultationSessionByAppointmentIdUseCase: GetConsultationSessionByAppointmentIdUseCase,
    private readonly getSchedulingRulesUseCase: GetSchedulingRulesUseCase,
  ) {}

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

    const { start, end } = utcDayRange(new Date());
    const todaysAppointments = await this.listAppointmentsForDoctorUseCase.execute({
      doctorId: doctorProfile.getId(),
      scheduledFrom: start,
      scheduledTo: end,
    });

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

    const { start, end } = utcDayRange(new Date());
    const todaysAppointments = await this.listAppointmentsForDoctorUseCase.execute({
      doctorId: doctorProfile.getId(),
      scheduledFrom: start,
      scheduledTo: end,
    });
    const todaysQueueable = todaysAppointments
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

// [start, end) for the UTC calendar day containing `date` -- keeps "today"
// simple and timezone-consistent, while letting the query filter at the
// database level instead of fetching a doctor's entire appointment history
// to filter in memory (Production Readiness Audit finding).
function utcDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
