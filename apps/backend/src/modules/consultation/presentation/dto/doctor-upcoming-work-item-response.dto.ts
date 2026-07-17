// Backs GET /appointments/doctor/upcoming-work, matching the frontend's
// `UpcomingWorkItem` shape (`apps/frontend/src/features/doctor/api/types.ts`)
// exactly. `title` is the patient's own display name -- a doctor legitimately
// sees their own patients' names (unlike a patient seeing another patient's
// name). `description` is the appointment's reasonForVisit, never fabricated.
export class DoctorUpcomingWorkItemResponseDto {
  id!: string;
  scheduledAt!: string;
  title!: string;
  description?: string;
  status!: 'upcoming' | 'in-progress' | 'completed' | 'cancelled';
}
