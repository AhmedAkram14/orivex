import { AuditAction as PrismaAuditAction } from '@prisma/client';
import type { Prisma } from '@prisma/client';

import { AuditLog } from '../../domain/entities/audit-log.entity.js';
import { AuditAction } from '../../domain/enums/audit-action.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake. This is the sole place the two vocabularies are translated
// (mirrors security-event.mapper.ts's established pattern).
const DOMAIN_TO_PRISMA_ACTION: Record<AuditAction, PrismaAuditAction> = {
  [AuditAction.HealthGraphRead]: PrismaAuditAction.HEALTH_GRAPH_READ,
  [AuditAction.HealthJourneysRead]: PrismaAuditAction.HEALTH_JOURNEYS_READ,
  [AuditAction.PatientChartProfileRead]: PrismaAuditAction.PATIENT_CHART_PROFILE_READ,
  [AuditAction.PatientChartAppointmentsRead]: PrismaAuditAction.PATIENT_CHART_APPOINTMENTS_READ,
  [AuditAction.PatientChartMedicalRecordsRead]: PrismaAuditAction.PATIENT_CHART_MEDICAL_RECORDS_READ,
  [AuditAction.PatientChartPrescriptionsRead]: PrismaAuditAction.PATIENT_CHART_PRESCRIPTIONS_READ,
  [AuditAction.PatientChartDocumentsRead]: PrismaAuditAction.PATIENT_CHART_DOCUMENTS_READ,
  [AuditAction.PatientChartVitalsRead]: PrismaAuditAction.PATIENT_CHART_VITALS_READ,
  [AuditAction.ClinicalNoteRecorded]: PrismaAuditAction.CLINICAL_NOTE_RECORDED,
  [AuditAction.DiagnosisRecorded]: PrismaAuditAction.DIAGNOSIS_RECORDED,
  [AuditAction.VitalReadingRecorded]: PrismaAuditAction.VITAL_READING_RECORDED,
  [AuditAction.PrescriptionSigned]: PrismaAuditAction.PRESCRIPTION_SIGNED,
  [AuditAction.DoctorVerificationDecided]: PrismaAuditAction.DOCTOR_VERIFICATION_DECIDED,
  [AuditAction.VerificationCaseSuspended]: PrismaAuditAction.VERIFICATION_CASE_SUSPENDED,
  [AuditAction.JourneyStageUpdated]: PrismaAuditAction.JOURNEY_STAGE_UPDATED,
};

export interface PersistedAuditLog {
  id: string;
  actorAccountId: string;
  actorRole: string;
  action: PrismaAuditAction;
  subjectType: string;
  subjectId: string;
  reason: string | null;
  metadata: Prisma.InputJsonValue;
  createdAt: Date;
}

// The one place that knows how the AuditLog aggregate maps to Prisma's row
// shape. Write-only, matching AuditLogRepository's own append-only surface
// -- no reverse (row-to-domain) mapping exists yet since nothing reads
// AuditLog rows back through the domain layer today.
export function toPersistedAuditLog(entry: AuditLog): PersistedAuditLog {
  return {
    id: entry.getId(),
    actorAccountId: entry.getActorAccountId(),
    actorRole: entry.getActorRole(),
    action: DOMAIN_TO_PRISMA_ACTION[entry.getAction()],
    subjectType: entry.getSubjectType(),
    subjectId: entry.getSubjectId(),
    reason: entry.getReason() ?? null,
    metadata: entry.getMetadata() as Prisma.InputJsonValue,
    createdAt: entry.getCreatedAt(),
  };
}
