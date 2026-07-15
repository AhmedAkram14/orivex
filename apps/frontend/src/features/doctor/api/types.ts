export interface DoctorDashboardSummary {
  consultationsToday: number;
  patientsInQueue: number;
  completedToday: number;
}

export type UpcomingWorkStatus = 'upcoming' | 'in-progress' | 'completed' | 'cancelled';

export interface UpcomingWorkItem {
  id: string;
  /** ISO timestamp — components format it for display, this type never carries pre-formatted text. */
  scheduledAt: string;
  title: string;
  description?: string;
  status: UpcomingWorkStatus;
}

export type UpcomingWorkResponse = UpcomingWorkItem[];
