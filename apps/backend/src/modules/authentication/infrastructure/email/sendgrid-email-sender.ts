import { Injectable } from '@nestjs/common';
import type { MailDataRequired, MailService } from '@sendgrid/mail';

import type { EmailSenderPort } from '../../application/ports/email-sender.port.js';

// The narrow slice of @sendgrid/mail's MailService this adapter actually
// calls -- narrowed down so a hand-written fake can implement it in tests
// (this codebase's established convention: no mocking library), matching
// StripeClient/QueueLike's own pattern.
export type SendGridClient = Pick<MailService, 'send'>;

// Renders this module's own known email templates into a subject/body pair.
// Deliberately plain text, not SendGrid's dynamic-template-id feature --
// avoids a second piece of provider-side configuration (template IDs
// created in SendGrid's own dashboard) for a V1 that only sends three,
// short, non-marketing transactional emails.
const TEMPLATE_RENDERERS: Record<string, (data: Record<string, unknown>) => { subject: string; text: string }> = {
  'email-verification': (data) => ({
    subject: 'Verify your Orivex email address',
    text: `Use this code to verify your email address: ${String(data.token)}`,
  }),
  'password-reset': (data) => ({
    subject: 'Reset your Orivex password',
    text: `Use this code to reset your password: ${String(data.token)}`,
  }),
  'appointment-reminder': (data) => ({
    subject: 'Upcoming Orivex appointment reminder',
    text: `You have an upcoming appointment scheduled for ${String(data.scheduledAt)}.`,
  }),
};

// Real email provider (ORIVEX Roadmap 2.0 implementation program, Stage 3).
// Bound in authentication.module.ts only when SENDGRID_API_KEY and
// SENDGRID_FROM_EMAIL are both set -- falls back to LoggingEmailSender
// otherwise (that adapter already logs rather than throwing when
// unconfigured, since a missing email provider must never block
// registration/password-reset; the token is still usable, just not
// emailed -- a different tradeoff than PaymentGatewayPort/
// RoomTokenGeneratorPort's throw-when-invoked idiom, deliberately).
@Injectable()
export class SendGridEmailSender implements EmailSenderPort {
  constructor(
    private readonly client: SendGridClient,
    private readonly fromEmail: string,
  ) {}

  async send(to: string, template: string, data: Record<string, unknown>): Promise<void> {
    const render = TEMPLATE_RENDERERS[template] ?? ((d: Record<string, unknown>) => ({ subject: template, text: JSON.stringify(d) }));
    const { subject, text } = render(data);

    const message: MailDataRequired = {
      to,
      from: this.fromEmail,
      subject,
      text,
    };
    await this.client.send(message);
  }
}
