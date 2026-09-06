// Matches AuditLog's Prisma enum exactly (schema.prisma's own comment: audit
// trail gap fix, ORIVEX Remaining Work Audit P0 C2). One value per PHI read
// or clinical/administrative write this codebase currently exposes --
// mirrors SecurityEventType's own "one enum per producible outcome"
// convention, lower_snake domain-side, translated to UPPER_SNAKE at the
// Prisma boundary by audit-log.mapper.ts.
export enum AuditAction {
  HealthGraphRead = 'health_graph_read',
  HealthJourneysRead = 'health_journeys_read',
  PatientChartProfileRead = 'patient_chart_profile_read',
  PatientChartAppointmentsRead = 'patient_chart_appointments_read',
  PatientChartMedicalRecordsRead = 'patient_chart_medical_records_read',
  PatientChartPrescriptionsRead = 'patient_chart_prescriptions_read',
  PatientChartDocumentsRead = 'patient_chart_documents_read',
  PatientChartVitalsRead = 'patient_chart_vitals_read',
  ClinicalNoteRecorded = 'clinical_note_recorded',
  DiagnosisRecorded = 'diagnosis_recorded',
  VitalReadingRecorded = 'vital_reading_recorded',
  PrescriptionSigned = 'prescription_signed',
  DoctorVerificationDecided = 'doctor_verification_decided',
  VerificationCaseSuspended = 'verification_case_suspended',
  JourneyStageUpdated = 'journey_stage_updated',
}
