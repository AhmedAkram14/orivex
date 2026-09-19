// Doctor Settings Rebuild (Phase 0): the delivery channels a notification
// preference toggle can gate. SMS/push are deliberately excluded -- no
// provider exists for either.
export enum NotificationChannel {
  Email = 'email',
  InApp = 'in_app',
}
