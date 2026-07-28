// Doctor-approval-workflow fix: the Doctor Workspace's "Pending approval"
// list (GET /appointments/doctor/pending-approval) -- every Requested
// appointment for this doctor, regardless of date (a request isn't
// date-scoped the way the same-day Patient Queue is), so the doctor can
// approve it and let it enter the real queue.
export class PendingApprovalAppointmentResponseDto {
  id!: string;
  patientName!: string;
  scheduledAt!: string;
  reasonForVisit?: string;
  consultationType!: 'free' | 'paid';
}
