// Matches docs/05-information-architecture.md's Notifications Domain
// categories at a formatting level, not a business-meaning level (the
// domain never originates meaning, only formats/delivers what other
// domains produce).
export enum NotificationSeverity {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Danger = 'danger',
}
