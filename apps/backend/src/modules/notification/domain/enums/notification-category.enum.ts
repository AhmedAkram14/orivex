// Doctor Settings Rebuild (Phase 0): the coarse categories a notification
// preference toggle can gate. Confirmed during this phase that no
// messaging-notification handler exists through NotificationModule
// (Messaging pushes exclusively via its own realtime socket channel) --
// Messages is deliberately not a category here.
export enum NotificationCategory {
  Appointments = 'appointments',
  Billing = 'billing',
}
