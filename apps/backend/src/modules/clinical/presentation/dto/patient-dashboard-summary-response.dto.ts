// The Patient Portal dashboard's summary counts (GET /patients/me/dashboard-summary).
// Composed at the controller layer from ConsultationModule's appointments and
// ClinicalModule's prescriptions -- not backed by a single aggregate.
export class PatientDashboardSummaryResponseDto {
  upcomingAppointmentsCount!: number;
  activePrescriptionsCount!: number;
  /** ISO timestamp of the most recent Completed-status appointment -- undefined when the patient has none, never a fabricated date. */
  lastVisitAt?: string;

  static create(props: {
    upcomingAppointmentsCount: number;
    activePrescriptionsCount: number;
    lastVisitAt?: string;
  }): PatientDashboardSummaryResponseDto {
    const dto = new PatientDashboardSummaryResponseDto();
    dto.upcomingAppointmentsCount = props.upcomingAppointmentsCount;
    dto.activePrescriptionsCount = props.activePrescriptionsCount;
    dto.lastVisitAt = props.lastVisitAt;
    return dto;
  }
}
