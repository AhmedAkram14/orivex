import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { ForbiddenError, NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { ListMediaAssetsForOwnerUseCase } from '../../../asset/application/use-cases/list-media-assets-for-owner/list-media-assets-for-owner.use-case.js';
import { CLINICAL_MEDIA_ASSET_PURPOSES } from '../../../asset/domain/enums/media-asset-purpose.enum.js';
import { MediaAssetListItemResponseDto } from '../../../asset/presentation/dto/media-asset-list-item-response.dto.js';
import { GetAppointmentsForDoctorAndPatientUseCase } from '../../../consultation/application/use-cases/get-appointments-for-doctor-and-patient/get-appointments-for-doctor-and-patient.use-case.js';
import { GetConsultationSessionByAppointmentIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-appointment-id/get-consultation-session-by-appointment-id.use-case.js';
import type { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { AppointmentListItemResponseDto } from '../../../consultation/presentation/dto/appointment-list-item-response.dto.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientProfileResponseDto } from '../../../patient/presentation/dto/patient-profile-response.dto.js';
import { ListInsuranceProvidersUseCase } from '../../../reference/application/use-cases/list-insurance-providers/list-insurance-providers.use-case.js';
import { ListMedicalSpecialtiesUseCase } from '../../../reference/application/use-cases/list-medical-specialties/list-medical-specialties.use-case.js';
import { GetHealthGraphSubgraphUseCase } from '../../application/use-cases/get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';
import { ListClinicalNotesForConsultationSessionUseCase } from '../../application/use-cases/list-clinical-notes-for-consultation-session/list-clinical-notes-for-consultation-session.use-case.js';
import { ListPrescriptionsForConsultationSessionUseCase } from '../../application/use-cases/list-prescriptions-for-consultation-session/list-prescriptions-for-consultation-session.use-case.js';
import { ListVitalReadingsForPatientUseCase } from '../../application/use-cases/list-vital-readings-for-patient/list-vital-readings-for-patient.use-case.js';
import type { Prescription } from '../../domain/entities/prescription.entity.js';
import { HealthGraphNodeType } from '../../domain/enums/health-graph-node-type.enum.js';
import { VitalType } from '../../domain/enums/vital-type.enum.js';
import { HealthVitalSummaryResponseDto } from '../dto/health-vital-summary-response.dto.js';
import { MedicalRecordEntryResponseDto } from '../dto/medical-record-entry-response.dto.js';
import { PatientPrescriptionResponseDto } from '../dto/patient-prescription-response.dto.js';
import { RecordAuditLogCommand } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.command.js';
import { RecordAuditLogUseCase } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.use-case.js';
import { GetConsentStateUseCase } from '../../../trust/application/use-cases/get-consent-state/get-consent-state.use-case.js';
import { GENERAL_CONSENT_SCOPE_CODE } from '../../../trust/domain/constants/consent-scope-codes.js';
import { AuditAction } from '../../../trust/domain/enums/audit-action.enum.js';
import { ConsentState } from '../../../trust/domain/enums/consent-state.enum.js';

const ALL_VITAL_TYPES: readonly VitalType[] = [VitalType.Weight, VitalType.BloodPressure, VitalType.BloodSugar];

interface PrescriptionView {
  prescription: Prescription;
  medicationName: string;
}

// The authenticated, authorized clinical chart -- the counterpart to
// PublicModule's deliberately minimal PublicPatientsController.
// EXPLORE -> UNDERSTAND -> BUILD TRUST -> TAKE ACTION -> AUTHENTICATE: a
// visitor can browse doctors/reviews freely with no session, but a patient's
// actual clinical record (blood type, allergies, prescriptions, notes,
// documents) only ever appears here, behind a real sign-in AND a real
// doctor-patient relationship check.
//
// DOCTOR-OWNED ENCOUNTERS ONLY (explicit product decision -- no care-team/
// shared-EHR model exists or is being built here): every clinical read below
// is scoped to encounters where the CALLING doctor was the treating doctor,
// resolved once via GetAppointmentsForDoctorAndPatientUseCase (the same
// underlying appointment query DoctorAppointmentsController.getDoctorPatients
// already performs, just filtered to one patient instead of grouped across
// all of them). An empty result means no legitimate encounter ever existed
// between this doctor and this patient -- every route then throws the same
// NotFoundError PatientProfileController/PublicPatientsController already
// use to never reveal a patient's existence to someone unauthorized.
//
// Documents are the one deliberate exception to "doctor-owned encounters
// only": MediaAsset belongs to the patient's account, not to a specific
// consultation session, so there's no real per-encounter link to scope by.
// An authorized doctor (has at least one real appointment with this patient)
// sees every CLINICAL-purpose document that patient has -- never identity-
// verification uploads (CLINICAL_MEDIA_ASSET_PURPOSES excludes those by
// construction). No new document-to-session linking model is introduced.
//
// Audit trail gap fix (ORIVEX Remaining Work Audit, P0 C2): every route
// below records a real audit entry after requireRelationship succeeds --
// never before, so a rejected read (unrelated doctor, ownership-safe 404)
// leaves no audit row claiming an access that never actually happened.
@Controller('doctor/patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Doctor)
export class DoctorPatientChartController {
  constructor(
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
    private readonly getAppointmentsForDoctorAndPatientUseCase: GetAppointmentsForDoctorAndPatientUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly listInsuranceProvidersUseCase: ListInsuranceProvidersUseCase,
    private readonly getConsultationSessionByAppointmentIdUseCase: GetConsultationSessionByAppointmentIdUseCase,
    private readonly listMedicalSpecialtiesUseCase: ListMedicalSpecialtiesUseCase,
    private readonly listPrescriptionsForConsultationSessionUseCase: ListPrescriptionsForConsultationSessionUseCase,
    private readonly listClinicalNotesForConsultationSessionUseCase: ListClinicalNotesForConsultationSessionUseCase,
    private readonly getHealthGraphSubgraphUseCase: GetHealthGraphSubgraphUseCase,
    private readonly listMediaAssetsForOwnerUseCase: ListMediaAssetsForOwnerUseCase,
    private readonly listVitalReadingsForPatientUseCase: ListVitalReadingsForPatientUseCase,
    private readonly recordAuditLogUseCase: RecordAuditLogUseCase,
    private readonly getConsentStateUseCase: GetConsentStateUseCase,
  ) {}

  @Get(':id/profile')
  async getProfile(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) patientId: string,
  ): Promise<ResponseEnvelope<PatientProfileResponseDto>> {
    const { profile, account } = await this.requireRelationship(user, patientId);

    let insuranceProviderName: string | undefined;
    const insuranceProviderId = profile.getInsuranceProviderId();
    if (insuranceProviderId) {
      const providers = await this.listInsuranceProvidersUseCase.execute();
      insuranceProviderName = providers.find((provider) => provider.getId() === insuranceProviderId)?.getName();
    }

    await this.recordAudit(user, patientId, AuditAction.PatientChartProfileRead);

    return envelope(PatientProfileResponseDto.fromDomain(profile, account, insuranceProviderName));
  }

  @Get(':id/appointments')
  async getAppointments(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) patientId: string,
  ): Promise<ResponseEnvelope<AppointmentListItemResponseDto[]>> {
    const { doctorProfile, ownAppointments } = await this.requireRelationship(user, patientId);

    const doctorAccount = await this.getAccountByIdUseCase.execute({ accountId: doctorProfile.getAccountId() });
    if (!doctorAccount) {
      return envelope([]);
    }
    const specialtyNames = await this.resolveSpecialtyNames();
    const specialty = specialtyNames.get(doctorProfile.getSpecialtyId());

    const sorted = [...ownAppointments].sort((a, b) => b.getScheduledAt().getTime() - a.getScheduledAt().getTime());
    const items = await Promise.all(
      sorted.map(async (appointment) => {
        const session = await this.getConsultationSessionByAppointmentIdUseCase.execute({ appointmentId: appointment.getId() });
        return AppointmentListItemResponseDto.fromDomain(
          appointment,
          doctorAccount,
          session?.getId() ?? null,
          specialty?.name ?? 'Unknown specialty',
          specialty?.nameAr ?? null,
        );
      }),
    );
    await this.recordAudit(user, patientId, AuditAction.PatientChartAppointmentsRead);
    return envelope(items);
  }

  @Get(':id/medical-records')
  async getMedicalRecords(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) patientId: string,
  ): Promise<ResponseEnvelope<MedicalRecordEntryResponseDto[]>> {
    const { doctorProfile, ownAppointments } = await this.requireRelationship(user, patientId);

    const doctorAccount = await this.getAccountByIdUseCase.execute({ accountId: doctorProfile.getAccountId() });
    const doctorName = doctorAccount?.getUserProfile().getDisplayName().toString();

    const visitEntries = await this.findVisitEntries(ownAppointments, doctorName);

    // DOCTOR-OWNED ENCOUNTERS ONLY: the health graph query itself returns
    // every condition node for this patient regardless of authoring doctor
    // (it has no relationship concept of its own -- see HealthGraphController's
    // own comment), so this is the one place a real explicit filter by
    // authoringDoctorId is required to keep another doctor's diagnoses out.
    const nodes = await this.getHealthGraphSubgraphUseCase.execute({ patientId });
    const ownConditionNodes = nodes.filter(
      (node) => node.getNodeType() === HealthGraphNodeType.Condition && node.getAuthoringDoctorId() === doctorProfile.getId(),
    );
    const conditionEntries = ownConditionNodes.map((node) =>
      MedicalRecordEntryResponseDto.create({
        id: node.getId(),
        type: 'condition',
        date: node.getCreatedAt().toISOString(),
        title: node.getFreeTextDescription() ?? 'Condition noted',
        description: undefined,
        doctorName,
        downloadUrl: undefined,
      }),
    );

    const entries = [...visitEntries, ...conditionEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    await this.recordAudit(user, patientId, AuditAction.PatientChartMedicalRecordsRead);
    return envelope(entries);
  }

  @Get(':id/prescriptions')
  async getPrescriptions(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) patientId: string,
  ): Promise<ResponseEnvelope<PatientPrescriptionResponseDto[]>> {
    const { doctorProfile, ownAppointments } = await this.requireRelationship(user, patientId);

    const doctorAccount = await this.getAccountByIdUseCase.execute({ accountId: doctorProfile.getAccountId() });
    const doctorName = doctorAccount?.getUserProfile().getDisplayName().toString() ?? '';

    const allPrescriptions = await this.findOwnPrescriptions(ownAppointments, doctorProfile.getId());
    const items = allPrescriptions.map((view) => this.toPatientPrescriptionResponse(view, doctorName));
    await this.recordAudit(user, patientId, AuditAction.PatientChartPrescriptionsRead);
    return envelope(items);
  }

  @Get(':id/documents')
  async getDocuments(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) patientId: string,
  ): Promise<ResponseEnvelope<MediaAssetListItemResponseDto[]>> {
    const { profile } = await this.requireRelationship(user, patientId);

    const results = await this.listMediaAssetsForOwnerUseCase.execute({
      ownerAccountId: profile.getAccountId(),
      purposes: [...CLINICAL_MEDIA_ASSET_PURPOSES],
    });
    await this.recordAudit(user, patientId, AuditAction.PatientChartDocumentsRead);
    return envelope(results.map(({ asset, signedUrl }) => MediaAssetListItemResponseDto.fromDomain(asset, signedUrl)));
  }

  // Real Clinical Vitals Demo pass. DOCTOR-OWNED ENCOUNTERS ONLY, same
  // filter shape as getMedicalRecords' own condition-node filter just above:
  // ListVitalReadingsForPatientUseCase has no relationship concept of its
  // own (returns every reading for the patient, any recording doctor), so
  // this is the one place a real explicit `recordedByDoctorId` filter is
  // required to keep another doctor's recorded vitals out of this chart.
  @Get(':id/vitals')
  async getVitals(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) patientId: string,
  ): Promise<ResponseEnvelope<HealthVitalSummaryResponseDto[]>> {
    const { doctorProfile } = await this.requireRelationship(user, patientId);

    const readings = await this.listVitalReadingsForPatientUseCase.execute({ patientId });
    const ownReadings = readings.filter((reading) => reading.getRecordedByDoctorId() === doctorProfile.getId());
    const summaries = ALL_VITAL_TYPES.map((type) =>
      HealthVitalSummaryResponseDto.create({
        type,
        readings: ownReadings.filter((reading) => reading.getType() === type),
      }),
    );
    await this.recordAudit(user, patientId, AuditAction.PatientChartVitalsRead);
    return envelope(summaries);
  }

  // Audit trail gap fix (ORIVEX Remaining Work Audit, P0 C2): the one
  // helper every read route above ends with, once its own data fetch has
  // already succeeded -- centralizes the actor/subject shape so each route
  // only has to name which action it performed.
  private async recordAudit(user: AccessTokenClaims, patientId: string, action: AuditAction): Promise<void> {
    await this.recordAuditLogUseCase.execute(
      new RecordAuditLogCommand({
        actorAccountId: user.accountId,
        actorRole: user.role,
        action,
        subjectType: 'patient',
        subjectId: patientId,
      }),
    );
  }

  // The one relationship check every route above starts with. Never reveals
  // whether a patient id exists at all to a doctor with no real encounter --
  // same NotFoundError, same message shape, regardless of which is true.
  //
  // Consent gap fix (ORIVEX Remaining Work Audit, P0 C3): a real encounter
  // is necessary but not sufficient -- if the patient has since revoked
  // consent for this doctor, access is blocked with a distinct 403
  // CONSENT_NOT_GRANTED (the patient's existence to this doctor is already
  // legitimate; this is "access denied," not "hide that this exists"),
  // exactly matching HealthGraphController's own split and
  // docs/12-openapi.md's documented Forbidden response.
  private async requireRelationship(user: AccessTokenClaims, patientId: string) {
    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!doctorProfile) {
      throw new NotFoundError(`Patient "${patientId}" not found.`);
    }

    const ownAppointments = await this.getAppointmentsForDoctorAndPatientUseCase.execute({
      doctorId: doctorProfile.getId(),
      patientId,
    });
    if (ownAppointments.length === 0) {
      throw new NotFoundError(`Patient "${patientId}" not found.`);
    }

    const consentState = await this.getConsentStateUseCase.execute({
      patientId,
      doctorId: doctorProfile.getId(),
      scopeCode: GENERAL_CONSENT_SCOPE_CODE,
    });
    if (consentState === ConsentState.Revoked) {
      throw new ForbiddenError('This doctor does not have consent to view the requested data.', 'CONSENT_NOT_GRANTED');
    }

    const profile = await this.getPatientProfileByIdUseCase.execute({ patientProfileId: patientId });
    if (!profile) {
      throw new NotFoundError(`Patient "${patientId}" not found.`);
    }
    const account = await this.getAccountByIdUseCase.execute({ accountId: profile.getAccountId() });
    if (!account) {
      throw new NotFoundError(`Patient "${patientId}" not found.`);
    }

    return { doctorProfile, profile, account, ownAppointments };
  }

  private async resolveSpecialtyNames(): Promise<Map<string, { name: string; nameAr: string | null }>> {
    const specialties = await this.listMedicalSpecialtiesUseCase.execute();
    return new Map(
      specialties.map((specialty) => [specialty.getId(), { name: specialty.getName(), nameAr: specialty.getNameAr() ?? null }]),
    );
  }

  private async findOwnPrescriptions(appointments: Appointment[], doctorProfileId: string): Promise<PrescriptionView[]> {
    const perAppointment = await Promise.all(
      appointments.map(async (appointment) => {
        const session = await this.getConsultationSessionByAppointmentIdUseCase.execute({ appointmentId: appointment.getId() });
        if (!session) {
          return [];
        }
        const prescriptions = await this.listPrescriptionsForConsultationSessionUseCase.execute({
          consultationSessionId: session.getId(),
        });
        // Defense in depth: every prescription found here already belongs to
        // a session from a doctor-owned appointment, but this doctor-authored
        // check is cheap and matches the spec's wording exactly.
        return prescriptions
          .filter((prescription) => prescription.getAuthoringDoctorId() === doctorProfileId)
          .map((prescription): PrescriptionView => {
            const [firstLineItem] = prescription.getLineItems();
            const medicationName = firstLineItem ? firstLineItem.getDrugName() ?? firstLineItem.getDrugCatalogId() : '';
            return { prescription, medicationName };
          });
      }),
    );
    return perAppointment.flat();
  }

  private toPatientPrescriptionResponse(view: PrescriptionView, doctorName: string): PatientPrescriptionResponseDto {
    const [firstLineItem] = view.prescription.getLineItems();
    const status = view.prescription.isCurrentlyActive(new Date()) ? 'active' : 'expired';
    const prescribedAt = (view.prescription.getSignedAt() ?? view.prescription.getCreatedAt()).toISOString();

    return PatientPrescriptionResponseDto.create({
      id: view.prescription.getId(),
      medicationName: view.medicationName,
      dosageAmount: firstLineItem?.getDosage() ?? '',
      frequencyLabel: firstLineItem?.getFrequency() ?? '',
      prescribedBy: doctorName,
      prescribedAt,
      status,
      instructions: firstLineItem?.getInstructions(),
    });
  }

  private async findVisitEntries(appointments: Appointment[], doctorName: string | undefined): Promise<MedicalRecordEntryResponseDto[]> {
    const perAppointment = await Promise.all(
      appointments.map(async (appointment) => {
        const session = await this.getConsultationSessionByAppointmentIdUseCase.execute({ appointmentId: appointment.getId() });
        if (!session) {
          return [];
        }
        const notes = await this.listClinicalNotesForConsultationSessionUseCase.execute({ consultationSessionId: session.getId() });
        return notes.map((note) =>
          MedicalRecordEntryResponseDto.create({
            id: note.getId(),
            type: 'visit',
            date: note.getCreatedAt().toISOString(),
            title: 'Clinical visit',
            description: note.getContent(),
            doctorName,
            downloadUrl: undefined,
          }),
        );
      }),
    );
    return perAppointment.flat();
  }
}
