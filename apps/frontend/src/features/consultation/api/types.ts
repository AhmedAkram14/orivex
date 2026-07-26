/** Matches ConsultationController's real ConsultationSessionResponseDto exactly. */
export interface ConsultationSession {
  id: string;
  appointmentId: string;
  state: 'waiting_room' | 'in_progress' | 'completed' | 'interrupted' | 'closed' | 'emergency_escalation';
  startedAt: string | null;
  closedAt: string | null;
}
