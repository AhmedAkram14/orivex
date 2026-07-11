// Matches docs/12-openapi.md's closeConsultation request body enum exactly.
export enum ConsultationCompletionReason {
  Completed = 'completed',
  InterruptedTechnical = 'interrupted_technical',
  InterruptedOther = 'interrupted_other',
}
