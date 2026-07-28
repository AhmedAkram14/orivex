// Cross-cutting port so feature modules (NotificationModule, ConsultationModule)
// can push a live event to one account's connected browser tab(s) without
// depending on the concrete socket.io gateway -- mirrors every other
// external-capability port in this codebase (EmailSenderPort,
// PaymentGatewayPort): an interface first, one real adapter bound in
// platform/realtime/realtime.module.ts.
export interface RealtimeEmitterPort {
  emitToAccount(accountId: string, event: string, payload: unknown): void;
}
