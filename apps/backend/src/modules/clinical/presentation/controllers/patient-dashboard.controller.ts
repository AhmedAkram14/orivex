import { Controller, Get, Inject, UseGuards } from '@nestjs/common';

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
import type { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../../consultation/domain/enums/appointment-status.enum.js';
import { GetConsultationSessionByAppointmentIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-appointment-id/get-consultation-session-by-appointment-id.use-case.js';
import { ListAppointmentsForPatientUseCase } from '../../../consultation/application/use-cases/list-appointments-for-patient/list-appointments-for-patient.use-case.js';
import { PRESCRIPTION_REPOSITORY } from '../../application/ports/tokens.js';
import { ListVitalReadingsForPatientUseCase } from '../../application/use-cases/list-vital-readings-for-patient/list-vital-readings-for-patient.use-case.js';
import { VitalType } from '../../domain/enums/vital-type.enum.js';
import type { Prescription } from '../../domain/entities/prescription.entity.js';
import type { PrescriptionRepository } from '../../domain/repositories/prescription.repository.js';
import { ActivePrescriptionPreviewResponseDto } from '../dto/active-prescription-preview-response.dto.js';
import { HealthVitalSummaryResponseDto } from '../dto/health-vital-summary-response.dto.js';
import { PatientDashboardSummaryResponseDto } from '../dto/patient-dashboard-summary-response.dto.js';
import { PatientPrescriptionResponseDto } from '../dto/patient-prescription-response.dto.js';
import { UpcomingAppointmentPreviewResponseDto } from '../dto/upcoming-appointment-preview-response.dto.js';

// Always exactly these 3 -- matches the frontend's HealthDashboardResponse
// contract, which expects one HealthVitalSummary per VitalType always, even
// when a type has zero readings (an honest empty state, not an error).
const ALL_VITAL_TYPES: readonly VitalType[] = [VitalType.Weight, VitalType.BloodPressure, VitalType.BloodSugar];

// Appointments still awaiting or scheduled for a real consultation
// (docs/12-openapi.md's AppointmentSummary.status) -- Cancelled/NoShow/
// Completed are all terminal, never shown as "upcoming."
const NON_TERMINAL_APPOINTMENT_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  AppointmentStatus.Requested,
  AppointmentStatus.Confirmed,
  AppointmentStatus.Rescheduled,
]);

interface ActivePrescriptionView {
  prescription: Prescription;
  medicationName: string;
}

// The Patient Portal dashboard's own additive read surface (Vertical Slice
// Development directive), living in ClinicalModule because it already
// imports PatientModule/DoctorModule/ConsultationModule plus owns
// PrescriptionRepository -- the one module with everything this composition
// needs. Every route is scoped to the caller's own data via the JWT, never a
// query param (never another patient's data), same pattern as
// PatientProfileController's /patients/me and AppointmentController's
// /appointments/me.
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Patient)
export class PatientDashboardController {
  constructor(
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly listAppointmentsForPatientUseCase: ListAppointmentsForPatientUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly getConsultationSessionByAppointmentIdUseCase: GetConsultationSessionByAppointmentIdUseCase,
    @Inject(PRESCRIPTION_REPOSITORY) private readonly prescriptionRepository: PrescriptionRepository,
    private readonly listVitalReadingsForPatientUseCase: ListVitalReadingsForPatientUseCase,
  ) {}

  @Get('me/dashboard-summary')
  async getDashboardSummary(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<PatientDashboardSummaryResponseDto>> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!patientProfile) {
      // No profile yet means no appointment/prescription could ever exist --
      // an honest empty summary, not an error.
      return envelope(
        PatientDashboardSummaryResponseDto.create({ upcomingAppointmentsCount: 0, activePrescriptionsCount: 0 }),
      );
    }

    const appointments = await this.listAppointmentsForPatientUseCase.execute({ patientId: patientProfile.getId() });
    const upcomingAppointmentsCount = appointments.filter((appointment) =>
      NON_TERMINAL_APPOINTMENT_STATUSES.has(appointment.getStatus()),
    ).length;

    const activePrescriptions = await this.findActivePrescriptions(appointments);

    const lastVisitAt = this.computeLastVisitAt(appointments);

    return envelope(
      PatientDashboardSummaryResponseDto.create({
        upcomingAppointmentsCount,
        activePrescriptionsCount: activePrescriptions.length,
        lastVisitAt,
      }),
    );
  }

  @Get('me/upcoming-appointments')
  async getUpcomingAppointments(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<UpcomingAppointmentPreviewResponseDto[]>> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!patientProfile) {
      return envelope([]);
    }

    const appointments = await this.listAppointmentsForPatientUseCase.execute({ patientId: patientProfile.getId() });
    const upcoming = appointments
      .filter((appointment) => NON_TERMINAL_APPOINTMENT_STATUSES.has(appointment.getStatus()))
      .sort((a, b) => a.getScheduledAt().getTime() - b.getScheduledAt().getTime());

    const items = await Promise.all(upcoming.map((appointment) => this.toUpcomingAppointmentPreview(appointment)));

    return envelope(items.filter((item): item is UpcomingAppointmentPreviewResponseDto => item !== null));
  }

  @Get('me/active-prescriptions')
  async getActivePrescriptions(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<ActivePrescriptionPreviewResponseDto[]>> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!patientProfile) {
      return envelope([]);
    }

    const appointments = await this.listAppointmentsForPatientUseCase.execute({ patientId: patientProfile.getId() });
    const activePrescriptions = await this.findActivePrescriptions(appointments);

    const items = await Promise.all(
      activePrescriptions.map((view) => this.toActivePrescriptionPreview(view)),
    );

    return envelope(items.filter((item): item is ActivePrescriptionPreviewResponseDto => item !== null));
  }

  @Get('me/prescriptions')
  async getPrescriptions(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<PatientPrescriptionResponseDto[]>> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!patientProfile) {
      return envelope([]);
    }

    const appointments = await this.listAppointmentsForPatientUseCase.execute({ patientId: patientProfile.getId() });
    const allPrescriptions = await this.findAllPrescriptions(appointments);

    const items = await Promise.all(allPrescriptions.map((view) => this.toPatientPrescriptionResponse(view)));

    return envelope(items.filter((item): item is PatientPrescriptionResponseDto => item !== null));
  }

  @Get('me/health-dashboard')
  async getHealthDashboard(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<HealthVitalSummaryResponseDto[]>> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!patientProfile) {
      // No profile yet means no vital could ever have been recorded -- an
      // honest empty summary for all 3 types, not an error.
      return envelope(ALL_VITAL_TYPES.map((type) => HealthVitalSummaryResponseDto.create({ type, readings: [] })));
    }

    const readings = await this.listVitalReadingsForPatientUseCase.execute({ patientId: patientProfile.getId() });
    const summaries = ALL_VITAL_TYPES.map((type) =>
      HealthVitalSummaryResponseDto.create({
        type,
        readings: readings.filter((reading) => reading.getType() === type),
      }),
    );

    return envelope(summaries);
  }

  private computeLastVisitAt(appointments: Appointment[]): string | undefined {
    const completedAppointments = appointments.filter(
      (appointment) => appointment.getStatus() === AppointmentStatus.Completed,
    );
    if (completedAppointments.length === 0) {
      return undefined;
    }
    const mostRecent = completedAppointments.reduce((latest, appointment) =>
      appointment.getScheduledAt().getTime() > latest.getScheduledAt().getTime() ? appointment : latest,
    );
    return mostRecent.getScheduledAt().toISOString();
  }

  // For each of the patient's appointments, resolves its ConsultationSession
  // (if any) and that session's prescriptions, then keeps only the ones
  // still active (signedAt + max durationDays across line items is still in
  // the future). No "active/expired" status field exists on the Prescription
  // entity -- this is computed here, never read off a stored field.
  private async findActivePrescriptions(appointments: Appointment[]): Promise<ActivePrescriptionView[]> {
    const now = Date.now();
    const all = await this.findAllPrescriptions(appointments);
    return all.filter((view) => this.isCurrentlyActive(view.prescription, now));
  }

  // For each of the patient's appointments, resolves its ConsultationSession
  // (if any) and that session's prescriptions -- every prescription found,
  // active and expired alike. Used by both the dashboard's "active only"
  // preview (which filters afterwards) and the full /me/prescriptions list
  // (which keeps everything and computes a per-item status instead).
  private async findAllPrescriptions(appointments: Appointment[]): Promise<ActivePrescriptionView[]> {
    const results: ActivePrescriptionView[] = [];

    for (const appointment of appointments) {
      const session = await this.getConsultationSessionByAppointmentIdUseCase.execute({
        appointmentId: appointment.getId(),
      });
      if (!session) {
        continue;
      }

      const prescriptions = await this.prescriptionRepository.findByConsultationSessionId(session.getId());
      for (const prescription of prescriptions) {
        const [firstLineItem] = prescription.getLineItems();
        const medicationName = firstLineItem ? firstLineItem.getDrugName() ?? firstLineItem.getDrugCatalogId() : '';
        results.push({ prescription, medicationName });
      }
    }

    return results;
  }

  private isCurrentlyActive(prescription: Prescription, now: number): boolean {
    const signedAt = prescription.getSignedAt();
    if (!signedAt) {
      return false;
    }
    const lineItems = prescription.getLineItems();
    if (lineItems.length === 0) {
      return false;
    }
    const maxDurationDays = Math.max(...lineItems.map((item) => item.getDurationDays()));
    const expiresAt = signedAt.getTime() + maxDurationDays * 24 * 60 * 60 * 1000;
    return expiresAt > now;
  }

  private async toUpcomingAppointmentPreview(
    appointment: Appointment,
  ): Promise<UpcomingAppointmentPreviewResponseDto | null> {
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
    return UpcomingAppointmentPreviewResponseDto.fromDomain(appointment, doctorProfile, doctorAccount);
  }

  private async toActivePrescriptionPreview(
    view: ActivePrescriptionView,
  ): Promise<ActivePrescriptionPreviewResponseDto | null> {
    const [firstLineItem] = view.prescription.getLineItems();
    if (!firstLineItem) {
      return null;
    }

    const doctorProfile: DoctorProfile | null = await this.getDoctorProfileByIdUseCase.execute({
      doctorProfileId: view.prescription.getAuthoringDoctorId(),
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

    return ActivePrescriptionPreviewResponseDto.create({
      id: view.prescription.getId(),
      medicationName: view.medicationName,
      dosageLabel: `${firstLineItem.getDosage()}, ${firstLineItem.getFrequency()}`,
      prescribedBy: doctorAccount.getUserProfile().getDisplayName().toString(),
    });
  }

  private async toPatientPrescriptionResponse(
    view: ActivePrescriptionView,
  ): Promise<PatientPrescriptionResponseDto | null> {
    const [firstLineItem] = view.prescription.getLineItems();
    if (!firstLineItem) {
      return null;
    }

    const doctorProfile: DoctorProfile | null = await this.getDoctorProfileByIdUseCase.execute({
      doctorProfileId: view.prescription.getAuthoringDoctorId(),
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

    const status = this.isCurrentlyActive(view.prescription, Date.now()) ? 'active' : 'expired';
    const prescribedAt = (view.prescription.getSignedAt() ?? view.prescription.getCreatedAt()).toISOString();

    return PatientPrescriptionResponseDto.create({
      id: view.prescription.getId(),
      medicationName: view.medicationName,
      dosageAmount: firstLineItem.getDosage(),
      frequencyLabel: firstLineItem.getFrequency(),
      prescribedBy: doctorAccount.getUserProfile().getDisplayName().toString(),
      prescribedAt,
      status,
      instructions: firstLineItem.getInstructions(),
    });
  }
}
