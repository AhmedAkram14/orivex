// Real email delivery now exists: authentication.module.ts binds
// SendGridEmailSender when SENDGRID_API_KEY/SENDGRID_FROM_EMAIL are set,
// SmtpEmailSender (Mailpit, local dev) when SMTP_HOST is set instead, or
// LoggingEmailSender (a documented stub, never a fake "delivered" response)
// when neither is configured. Swapping providers is always a new adapter
// bound here, never a change to any use case that depends on this port.
//
// `locale` (I3 -- Notification email delivery) is optional and defaults to
// 'en' at the adapter level -- every pre-existing call site that doesn't
// pass it keeps producing the exact same English content as before.
export interface EmailSenderPort {
  send(to: string, template: string, data: Record<string, unknown>, locale?: 'en' | 'ar'): Promise<void>;
}
