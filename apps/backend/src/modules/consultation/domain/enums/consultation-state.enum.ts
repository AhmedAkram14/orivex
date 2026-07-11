// Matches docs/12-openapi.md's ConsultationSummary.state enum exactly.
// EmergencyEscalation is modeled as a valid value only -- no transition
// into it is implemented this sprint (not in IMPLEMENTATION_PLAN.md's
// bullet list; the real escalation workflow is its own future sprint).
export enum ConsultationState {
  WaitingRoom = 'waiting_room',
  InProgress = 'in_progress',
  Completed = 'completed',
  Interrupted = 'interrupted',
  Closed = 'closed',
  EmergencyEscalation = 'emergency_escalation',
}
