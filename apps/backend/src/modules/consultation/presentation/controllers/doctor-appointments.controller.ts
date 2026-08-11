import { Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';

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
import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../domain/enums/appointment-status.enum.js';
import { ConsultationDomainError } from '../../domain/exceptions/consultation-domain.error.js';
import { ConfirmAppointmentCommand } from '../../application/use-cases/confirm-appointment/confirm-appointment.command.js';
import { ConfirmAppointmentUseCase } from '../../application/use-cases/confirm-appointment/confirm-appointment.use-case.js';
import { GetAppointmentByIdUseCase } from '../../application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByAppointmentIdUseCase } from '../../application/use-cases/get-consultation-session-by-appointment-id/get-consultation-session-by-appointment-id.use-case.js';
import { GetDoctorReportsSummaryUseCase } from '../../application/use-cases/get-doctor-reports-summary/get-doctor-reports-summary.use-case.js';
import { GetFollowUpRecommendationForSessionUseCase } from '../../application/use-cases/get-follow-up-recommendation-for-session/get-follow-up-recommendation-for-session.use-case.js';
import { ListAppointmentsForDoctorUseCase } from '../../application/use-cases/list-appointments-for-doctor/list-appointments-for-doctor.use-case.js';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import { DoctorDashboardSummaryResponseDto } from '../dto/doctor-dashboard-summary-response.dto.js';
import { DoctorPatientListItemResponseDto } from '../dto/doctor-patient-list-item-response.dto.js';
import { DoctorReportsSummaryResponseDto } from '../dto/doctor-reports-summary-response.dto.js';
import { DoctorUpcomingWorkItemResponseDto } from '../dto/doctor-upcoming-work-item-response.dto.js';
import { PendingApprovalAppointmentResponseDto } from '../dto/pending-approval-appointment-response.dto.js';
import { QueueEntryResponseDto } from '../dto/queue-entry-response.dto.js';
import { mapConsultationError } from '../mappers/consultation-exception.mapper.js';
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
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly confirmAppointmentUseCase: ConfirmAppointmentUseCase,
    private readonly getDoctorReportsSummaryUseCase: GetDoctorReportsSummaryUseCase,
    private readonly getFollowUpRecommendationForSessionUseCase: GetFollowUpRecommendationForSessionUseCase,
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

  // Doctor Workspace's "Patients" page -- every distinct patient the doctor
  // has ever had an appointment with, reusing the same full-history
  // `listAppointmentsForDoctorUseCase.execute({ doctorId })` call
  // `getDoctorUpcomingWork` already makes (unbounded, no date filter),
  // reduced to one row per patient (real visit count + most recent visit),
  // never a fabricated "seen" patient.
  @Get('doctor/patients')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Doctor)
  async getDoctorPatients(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<DoctorPatientListItemResponseDto[]>> {
    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!doctorProfile) {
      return envelope([]);
    }

    const appointments = await this.listAppointmentsForDoctorUseCase.execute({ doctorId: doctorProfile.getId() });
    const items = await this.toPatientListItems(appointments);
    return envelope(items.sort((a, b) => new Date(b.lastVisitAt).getTime() - new Date(a.lastVisitAt).getTime()));
  }

  // Doctor Workspace's "Reports" page -- real appointment-status counts +
  // the doctor's own real rating aggregate. See GetDoctorReportsSummaryUseCase's
  // own comment for why no day-over-day/time-series figure exists here.
  @Get('doctor/reports-summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Doctor)
  async getDoctorReportsSummary(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<DoctorReportsSummaryResponseDto>> {
    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!doctorProfile) {
      const empty = new DoctorReportsSummaryResponseDto();
      empty.totalAppointments = 0;
      empty.confirmed = 0;
      empty.completed = 0;
      empty.cancelled = 0;
      empty.noShow = 0;
      empty.averageRating = null;
      empty.reviewCount = 0;
      return envelope(empty);
    }

    const summary = await this.getDoctorReportsSummaryUseCase.execute({ doctorId: doctorProfile.getId() });
    const dto = new DoctorReportsSummaryResponseDto();
    dto.totalAppointments = summary.totalAppointments;
    dto.confirmed = summary.confirmed;
    dto.completed = summary.completed;
    dto.cancelled = summary.cancelled;
    dto.noShow = summary.noShow;
    dto.averageRating = summary.averageRating;
    dto.reviewCount = summary.reviewCount;
    return envelope(dto);
  }

  // Doctor-approval-workflow fix: every booking (Free or Paid) now lands
  // Requested and stays there until this list surfaces it and the doctor
  // approves it below -- not date-scoped like the Patient Queue above,
  // since a request isn't necessarily for today.
  @Get('doctor/pending-approval')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Doctor)
  async getPendingApproval(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<PendingApprovalAppointmentResponseDto[]>> {
    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!doctorProfile) {
      return envelope([]);
    }

    const appointments = await this.listAppointmentsForDoctorUseCase.execute({ doctorId: doctorProfile.getId() });
    // Consultation Pricing Lifecycle Completion: Paid appointments no
    // longer wait on doctor approval at all -- they confirm automatically
    // once the patient's payment succeeds (InitiateChargeUseCase). A Paid
    // appointment sitting Requested simply means the patient hasn't paid
    // yet, which is nothing for the doctor to act on here.
    const pending = appointments
      .filter((appointment) => appointment.getStatus() === AppointmentStatus.Requested && appointment.getPricing().isFree())
      .sort((a, b) => a.getScheduledAt().getTime() - b.getScheduledAt().getTime());

    const items = await Promise.all(pending.map((appointment) => this.toPendingApprovalItem(appointment)));
    return envelope(items.filter((item): item is PendingApprovalAppointmentResponseDto => item !== null));
  }

  // Doctor-approval-workflow: the doctor's explicit approval action for
  // Free bookings only -- Paid bookings confirm automatically once payment
  // succeeds (Consultation Pricing Lifecycle Completion: pay-then-confirm,
  // InitiateChargeUseCase calls this same ConfirmAppointmentUseCase itself
  // on a successful charge). A doctor can never manually approve a Paid
  // appointment into existence without a real payment behind it.
  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Doctor)
  async approve(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<AppointmentResponseDto>> {
    try {
      const existing = await this.getAppointmentByIdUseCase.execute({ appointmentId: id });
      if (!existing) {
        throw new NotFoundError(`Appointment "${id}" not found.`);
      }
      const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
      if (!doctorProfile || doctorProfile.getId() !== existing.getDoctorId()) {
        // 404, not 403 -- never confirms to a caller whether an appointment
        // id belonging to someone else's queue exists at all.
        throw new NotFoundError(`Appointment "${id}" not found.`);
      }
      if (!existing.getPricing().isFree()) {
        throw new ConsultationDomainError(
          'Paid appointments cannot be manually approved; they confirm automatically once the patient completes payment.',
        );
      }

      const result = await this.confirmAppointmentUseCase.execute(new ConfirmAppointmentCommand({ appointmentId: id }));
      return envelope(AppointmentResponseDto.fromDomain(result.appointment));
    } catch (error) {
      throw mapConsultationError(error);
    }
  }

  private async toPendingApprovalItem(appointment: Appointment): Promise<PendingApprovalAppointmentResponseDto | null> {
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

    const dto = new PendingApprovalAppointmentResponseDto();
    dto.id = appointment.getId();
    dto.patientName = patientAccount.getUserProfile().getDisplayName().toString();
    dto.scheduledAt = appointment.getScheduledAt().toISOString();
    dto.reasonForVisit = appointment.getReasonForVisit() ?? undefined;
    dto.consultationType = appointment.getPricing().getPricingType();
    return dto;
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

  private async toPatientListItems(appointments: Appointment[]): Promise<DoctorPatientListItemResponseDto[]> {
    const byPatientId = new Map<string, Appointment[]>();
    for (const appointment of appointments) {
      const existing = byPatientId.get(appointment.getPatientId()) ?? [];
      existing.push(appointment);
      byPatientId.set(appointment.getPatientId(), existing);
    }

    const entries = await Promise.all(
      Array.from(byPatientId.entries()).map(async ([patientId, patientAppointments]) => {
        const patientProfile = await this.getPatientProfileByIdUseCase.execute({ patientProfileId: patientId });
        if (!patientProfile) {
          return null;
        }
        const patientAccount: Account | null = await this.getAccountByIdUseCase.execute({
          accountId: patientProfile.getAccountId(),
        });
        if (!patientAccount) {
          return null;
        }

        const mostRecent = [...patientAppointments].sort(
          (a, b) => b.getScheduledAt().getTime() - a.getScheduledAt().getTime(),
        )[0]!;
        const now = new Date();
        const upcomingStatuses = new Set([AppointmentStatus.Requested, AppointmentStatus.Confirmed, AppointmentStatus.Rescheduled]);
        const nextAppointment = [...patientAppointments]
          .filter((appointment) => appointment.getScheduledAt() > now && upcomingStatuses.has(appointment.getStatus()))
          .sort((a, b) => a.getScheduledAt().getTime() - b.getScheduledAt().getTime())[0];

        // "Follow up" status (Patients page redesign): real, not guessed --
        // reuses ClinicalModule's own RecommendFollowUpUseCase output
        // (FollowUpRecommendationRepository, already exported from this
        // same ConsultationModule) rather than inventing a new signal. Only
        // checked when there's no upcoming appointment already, since a
        // booked follow-up visit is just "Active" again once it's on the
        // calendar.
        let hasFollowUpRecommendation = false;
        if (!nextAppointment && mostRecent.getStatus() === AppointmentStatus.Completed) {
          const session = await this.getConsultationSessionByAppointmentIdUseCase.execute({ appointmentId: mostRecent.getId() });
          if (session) {
            const followUp = await this.getFollowUpRecommendationForSessionUseCase.execute({
              consultationSessionId: session.getId(),
            });
            hasFollowUpRecommendation = followUp !== null;
          }
        }

        const userProfile = patientAccount.getUserProfile();
        const dto = new DoctorPatientListItemResponseDto();
        dto.patientProfileId = patientId;
        dto.patientName = userProfile.getDisplayName().toString();
        dto.email = patientAccount.getEmail().toString();
        dto.phoneNumber = userProfile.getPhoneNumber();
        dto.dateOfBirth = userProfile.getDateOfBirth()?.toISOString();
        dto.gender = userProfile.getGender();
        dto.visitCount = patientAppointments.length;
        dto.lastVisitAt = mostRecent.getScheduledAt().toISOString();
        dto.lastVisitStatus = mostRecent.getStatus();
        dto.nextAppointmentAt = nextAppointment?.getScheduledAt().toISOString();
        dto.hasFollowUpRecommendation = hasFollowUpRecommendation;
        return dto;
      }),
    );

    return entries.filter((entry): entry is DoctorPatientListItemResponseDto => entry !== null);
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
