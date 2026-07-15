// No real email/SMS integration exists anywhere in this backend yet. Infra
// binds to LoggingEmailSender (infrastructure/email/logging-email-sender.ts)
// for now — a documented stub, not a fake "delivered" response. Swapping in
// a real provider (e.g. SES) later only means a new adapter, never a change
// to any use case that depends on this port.
export interface EmailSenderPort {
  send(to: string, template: string, data: Record<string, unknown>): Promise<void>;
}
