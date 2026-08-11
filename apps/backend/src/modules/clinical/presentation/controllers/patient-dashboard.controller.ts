import { Controller, Get, UseGuards } from '@nestjs/common';

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
import { ListMedicalSpecialtiesUseCase } from '../../../reference/application/use-cases/list-medical-specialties/list-medical-specialties.use-case.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import type { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../../consultation/domain/enums/appointment-status.enum.js';
import { GetConsultationSessionByAppointmentIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-appointment-id/get-consultation-session-by-appointment-id.use-case.js';
import { ListAppointmentsForPatientUseCase } from '../../../consultation/application/use-cases/list-appointments-for-patient/list-appointments-for-patient.use-case.js';
import { GetHealthGraphSubgraphUseCase } from '../../application/use-cases/get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';
import { ListClinicalNotesForConsultationSessionUseCase } from '../../application/use-cases/list-clinical-notes-for-consultation-session/list-clinical-notes-for-consultation-session.use-case.js';
import { ListPrescriptionsForConsultationSessionUseCase } from '../../application/use-cases/list-prescriptions-for-consultation-session/list-prescriptions-for-consultation-session.use-case.js';
import { ListVitalReadingsForPatientUseCase } from '../../application/use-cases/list-vital-readings-for-patient/list-vital-readings-for-patient.use-case.js';
import type { HealthGraphNode } from '../../domain/entities/health-graph-node.entity.js';
import { HealthGraphNodeType } from '../../domain/enums/health-graph-node-type.enum.js';
import { VitalType } from '../../domain/enums/vital-type.enum.js';
import type { Prescription } from '../../domain/entities/prescription.entity.js';
import { ActivePrescriptionPreviewResponseDto } from '../dto/active-prescription-preview-response.dto.js';
import { HealthVitalSummaryResponseDto } from '../dto/health-vital-summary-response.dto.js';
import { MedicalRecordEntryResponseDto } from '../dto/medical-record-entry-response.dto.js';
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

// Resolved once per doctorProfileId per request and reused across every
// appointment/prescription/note that references the same doctor -- a
// patient's history routinely has the same treating doctor across many
// appointments/notes, so without this cache each one would repeat the same
// two lookups (Production Readiness Audit N+1 finding).
type DoctorCache = Map<string, { profile: DoctorProfile; account: Account } | null>;

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
    private readonly listPrescriptionsForConsultationSessionUseCase: ListPrescriptionsForConsultationSessionUseCase,
    private readonly listVitalReadingsForPatientUseCase: ListVitalReadingsForPatientUseCase,
    private readonly listClinicalNotesForConsultationSessionUseCase: ListClinicalNotesForConsultationSessionUseCase,
    private readonly getHealthGraphSubgraphUseCase: GetHealthGraphSubgraphUseCase,
    private readonly listMedicalSpecialtiesUseCase: ListMedicalSpecialtiesUseCase,
  ) {}

  // Onboarding Redesign (2026-07-21 proposal, Stage O.9): DoctorProfile no
  // longer carries its own free-text specialty name (dropped in favor of
  // specialtyId only) -- this dashboard's "upcoming appointment" preview
  // still needs a human-readable specialization string, so it's resolved
  // here, once per request (ReferenceModule's own specialty list is small
  // and already fully loaded either way), never per-appointment.
  private async resolveSpecialtyNames(): Promise<Map<string, { name: string; nameAr: string | null }>> {
    const specialties = await this.listMedicalSpecialtiesUseCase.execute();
    return new Map(
      specialties.map((specialty) => [specialty.getId(), { name: specialty.getName(), nameAr: specialty.getNameAr() ?? null }]),
    );
  }

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

    const doctorCache: DoctorCache = new Map();
    const specialtyNames = await this.resolveSpecialtyNames();
    const items = await Promise.all(
      upcoming.map((appointment) => this.toUpcomingAppointmentPreview(appointment, doctorCache, specialtyNames)),
    );

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

    const doctorCache: DoctorCache = new Map();
    const items = await Promise.all(
      activePrescriptions.map((view) => this.toActivePrescriptionPreview(view, doctorCache)),
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

    const doctorCache: DoctorCache = new Map();
    const items = await Promise.all(
      allPrescriptions.map((view) => this.toPatientPrescriptionResponse(view, doctorCache)),
    );

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

  @Get('me/medical-records')
  async getMedicalRecords(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<MedicalRecordEntryResponseDto[]>> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!patientProfile) {
      return envelope([]);
    }

    const appointments = await this.listAppointmentsForPatientUseCase.execute({ patientId: patientProfile.getId() });
    const doctorCache: DoctorCache = new Map();
    const visitEntries = await this.findVisitEntries(appointments, doctorCache);

    const nodes = await this.getHealthGraphSubgraphUseCase.execute({ patientId: patientProfile.getId() });
    const conditionEntries = await this.findConditionEntries(nodes, doctorCache);

    const entries = [...visitEntries, ...conditionEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return envelope(entries);
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
  // still active per Prescription.isCurrentlyActive() (a domain rule, not
  // computed here -- see that method for why).
  private async findActivePrescriptions(appointments: Appointment[]): Promise<ActivePrescriptionView[]> {
    const now = new Date();
    const all = await this.findAllPrescriptions(appointments);
    return all.filter((view) => view.prescription.isCurrentlyActive(now));
  }

  // For each of the patient's appointments, resolves its ConsultationSession
  // (if any) and that session's prescriptions -- every prescription found,
  // active and expired alike. Used by both the dashboard's "active only"
  // preview (which filters afterwards) and the full /me/prescriptions list
  // (which keeps everything and computes a per-item status instead).
  private async findAllPrescriptions(appointments: Appointment[]): Promise<ActivePrescriptionView[]> {
    const perAppointment = await Promise.all(
      appointments.map(async (appointment) => {
        const session = await this.getConsultationSessionByAppointmentIdUseCase.execute({
          appointmentId: appointment.getId(),
        });
        if (!session) {
          return [];
        }

        const prescriptions = await this.listPrescriptionsForConsultationSessionUseCase.execute({
          consultationSessionId: session.getId(),
        });
        return prescriptions.map((prescription): ActivePrescriptionView => {
          const [firstLineItem] = prescription.getLineItems();
          const medicationName = firstLineItem ? firstLineItem.getDrugName() ?? firstLineItem.getDrugCatalogId() : '';
          return { prescription, medicationName };
        });
      }),
    );

    return perAppointment.flat();
  }

  private async toUpcomingAppointmentPreview(
    appointment: Appointment,
    doctorCache: DoctorCache,
    specialtyNames: Map<string, { name: string; nameAr: string | null }>,
  ): Promise<UpcomingAppointmentPreviewResponseDto | null> {
    const resolved = await this.resolveDoctor(appointment.getDoctorId(), doctorCache);
    if (!resolved) {
      return null;
    }
    const specialty = specialtyNames.get(resolved.profile.getSpecialtyId());
    const specialization = specialty?.name ?? 'Unknown specialty';
    return UpcomingAppointmentPreviewResponseDto.fromDomain(
      appointment,
      resolved.account,
      specialization,
      specialty?.nameAr ?? null,
    );
  }

  private async toActivePrescriptionPreview(
    view: ActivePrescriptionView,
    doctorCache: DoctorCache,
  ): Promise<ActivePrescriptionPreviewResponseDto | null> {
    const [firstLineItem] = view.prescription.getLineItems();
    if (!firstLineItem) {
      return null;
    }

    const resolved = await this.resolveDoctor(view.prescription.getAuthoringDoctorId(), doctorCache);
    if (!resolved) {
      return null;
    }

    return ActivePrescriptionPreviewResponseDto.create({
      id: view.prescription.getId(),
      medicationName: view.medicationName,
      dosageLabel: `${firstLineItem.getDosage()}, ${firstLineItem.getFrequency()}`,
      prescribedBy: resolved.account.getUserProfile().getDisplayName().toString(),
    });
  }

  private async toPatientPrescriptionResponse(
    view: ActivePrescriptionView,
    doctorCache: DoctorCache,
  ): Promise<PatientPrescriptionResponseDto | null> {
    const [firstLineItem] = view.prescription.getLineItems();
    if (!firstLineItem) {
      return null;
    }

    const resolved = await this.resolveDoctor(view.prescription.getAuthoringDoctorId(), doctorCache);
    if (!resolved) {
      return null;
    }

    const status = view.prescription.isCurrentlyActive(new Date()) ? 'active' : 'expired';
    const prescribedAt = (view.prescription.getSignedAt() ?? view.prescription.getCreatedAt()).toISOString();

    return PatientPrescriptionResponseDto.create({
      id: view.prescription.getId(),
      medicationName: view.medicationName,
      dosageAmount: firstLineItem.getDosage(),
      frequencyLabel: firstLineItem.getFrequency(),
      prescribedBy: resolved.account.getUserProfile().getDisplayName().toString(),
      prescribedAt,
      status,
      instructions: firstLineItem.getInstructions(),
    });
  }

  // For each of the patient's appointments, resolves its ConsultationSession
  // (if any) and that session's clinical notes -- each note becomes a
  // 'visit' timeline entry (one per authored note, matching the domain's
  // "fully immutable, one per consultation session, or more if addenda
  // exist" rule -- no note is ever merged or deduplicated).
  private async findVisitEntries(
    appointments: Appointment[],
    doctorCache: DoctorCache,
  ): Promise<MedicalRecordEntryResponseDto[]> {
    const perAppointment = await Promise.all(
      appointments.map(async (appointment) => {
        const session = await this.getConsultationSessionByAppointmentIdUseCase.execute({
          appointmentId: appointment.getId(),
        });
        if (!session) {
          return [];
        }

        const notes = await this.listClinicalNotesForConsultationSessionUseCase.execute({
          consultationSessionId: session.getId(),
        });
        return Promise.all(
          notes.map(async (note) => {
            const doctorName = await this.resolveDoctorName(note.getAuthoringDoctorId(), doctorCache);
            return MedicalRecordEntryResponseDto.create({
              id: note.getId(),
              type: 'visit',
              date: note.getCreatedAt().toISOString(),
              title: 'Clinical visit',
              description: note.getContent(),
              doctorName,
              downloadUrl: undefined,
            });
          }),
        );
      }),
    );

    return perAppointment.flat();
  }

  // Only `condition`-typed nodes fit the timeline's 'condition' category --
  // symptom/medication/lab_result/radiology_result nodes are deliberately
  // excluded rather than shoehorned into a category that doesn't describe
  // them (no 3rd/4th category was asked for).
  private async findConditionEntries(
    nodes: HealthGraphNode[],
    doctorCache: DoctorCache,
  ): Promise<MedicalRecordEntryResponseDto[]> {
    const conditionNodes = nodes.filter((node) => node.getNodeType() === HealthGraphNodeType.Condition);

    return Promise.all(
      conditionNodes.map(async (node) => {
        const doctorName = await this.resolveDoctorName(node.getAuthoringDoctorId(), doctorCache);
        return MedicalRecordEntryResponseDto.create({
          id: node.getId(),
          type: 'condition',
          date: node.getCreatedAt().toISOString(),
          title: node.getFreeTextDescription() ?? 'Condition noted',
          description: undefined,
          doctorName,
          downloadUrl: undefined,
        });
      }),
    );
  }

  private async resolveDoctorName(
    authoringDoctorId: string | undefined,
    doctorCache: DoctorCache,
  ): Promise<string | undefined> {
    if (!authoringDoctorId) {
      return undefined;
    }
    const resolved = await this.resolveDoctor(authoringDoctorId, doctorCache);
    return resolved?.account.getUserProfile().getDisplayName().toString();
  }

  // The single place that actually calls GetDoctorProfileByIdUseCase +
  // GetAccountByIdUseCase -- every other helper in this controller goes
  // through this method so a doctor referenced multiple times in one
  // request (a repeat treating doctor across several appointments/notes)
  // is only ever fetched once.
  private async resolveDoctor(
    doctorProfileId: string,
    doctorCache: DoctorCache,
  ): Promise<{ profile: DoctorProfile; account: Account } | null> {
    const cached = doctorCache.get(doctorProfileId);
    if (cached !== undefined) {
      return cached;
    }

    const profile = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId });
    if (!profile) {
      doctorCache.set(doctorProfileId, null);
      return null;
    }
    const account = await this.getAccountByIdUseCase.execute({ accountId: profile.getAccountId() });
    const resolved = account ? { profile, account } : null;
    doctorCache.set(doctorProfileId, resolved);
    return resolved;
  }
}
