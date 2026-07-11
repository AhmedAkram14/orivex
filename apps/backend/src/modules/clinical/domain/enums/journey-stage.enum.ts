// Matches docs/12-openapi.md's HealthJourney.stage enum exactly.
export enum JourneyStage {
  Diagnosis = 'diagnosis',
  FollowUp = 'follow_up',
  Monitoring = 'monitoring',
  Resolved = 'resolved',
  OngoingChronic = 'ongoing_chronic',
  ReferredOut = 'referred_out',
}
