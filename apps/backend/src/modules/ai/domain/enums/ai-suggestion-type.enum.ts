// Matches docs/12-openapi.md's requestAISuggestion suggestionType enum exactly.
export enum AISuggestionType {
  SoapDraft = 'soap_draft',
  PrescriptionDraft = 'prescription_draft',
  InteractionFlag = 'interaction_flag',
  SuggestedQuestion = 'suggested_question',
  Summary = 'summary',
  FollowUpPlan = 'follow_up_plan',
}
