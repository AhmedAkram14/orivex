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
//
// email-verification/password-reset build a real clickable link when
// `frontendUrl` is known -- both `/verify-email` and `/reset-password`
// are link-only pages (they read `token` from the URL query string; no
// manual code-entry field exists anywhere in the frontend), so sending
// just the bare token left the recipient with no way to act on the
// email at all. Falls back to the bare token as plain text when
// `frontendUrl` is unset, matching this adapter's own graceful-
// degradation idiom for every other optional dependency.
function buildTemplateRenderers(
  frontendUrl: string | undefined,
): Record<string, (data: Record<string, unknown>) => { subject: string; text: string }> {
  return {
    'email-verification': (data) => ({
      subject: 'Verify your Orivex email address',
      text: frontendUrl
        ? `Verify your email address by opening this link: ${frontendUrl}/verify-email?token=${String(data.token)}`
        : `Use this code to verify your email address: ${String(data.token)}`,
    }),
    'password-reset': (data) => ({
      subject: 'Reset your Orivex password',
      text: frontendUrl
        ? `Reset your password by opening this link: ${frontendUrl}/reset-password?token=${String(data.token)}`
        : `Use this code to reset your password: ${String(data.token)}`,
    }),
    'appointment-reminder': (data) => ({
      subject: 'Upcoming Orivex appointment reminder',
      text: `You have an upcoming appointment scheduled for ${String(data.scheduledAt)}.`,
    }),
  };
}

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
    private readonly frontendUrl?: string,
  ) {}

  async send(to: string, template: string, data: Record<string, unknown>): Promise<void> {
    const renderers = buildTemplateRenderers(this.frontendUrl);
    const render = renderers[template] ?? ((d: Record<string, unknown>) => ({ subject: template, text: JSON.stringify(d) }));
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
