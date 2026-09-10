import { Injectable } from '@nestjs/common';
import type { MailDataRequired, MailService } from '@sendgrid/mail';

import type { EmailSenderPort } from '../../application/ports/email-sender.port.js';

import { buildEmailContent } from './templates/email-content.js';
import type { EmailLocale } from './templates/email-locale.js';
import { renderEmailHtml } from './templates/render-email-html.js';

// The narrow slice of @sendgrid/mail's MailService this adapter actually
// calls -- narrowed down so a hand-written fake can implement it in tests
// (this codebase's established convention: no mocking library), matching
// StripeClient/QueueLike's own pattern.
export type SendGridClient = Pick<MailService, 'send'>;

// Real email provider (ORIVEX Roadmap 2.0 implementation program, Stage 3).
// Bound in authentication.module.ts only when SENDGRID_API_KEY and
// SENDGRID_FROM_EMAIL are both set -- falls back to SmtpEmailSender (local
// Mailpit) or LoggingEmailSender otherwise (see email-sender.port.ts's own
// comment). Template content/HTML rendering live in ./templates/ (shared
// with SmtpEmailSender) -- this class is transport only, matching
// StripePaymentGatewayAdapter's own "adapter never contains business
// content" shape.
@Injectable()
export class SendGridEmailSender implements EmailSenderPort {
  constructor(
    private readonly client: SendGridClient,
    private readonly fromEmail: string,
    private readonly frontendUrl?: string,
  ) {}

  async send(to: string, template: string, data: Record<string, unknown>, locale: EmailLocale = 'en'): Promise<void> {
    const content = buildEmailContent(locale, template, data, this.frontendUrl);

    const message: MailDataRequired = {
      to,
      from: this.fromEmail,
      subject: content.subject,
      text: content.text,
      html: renderEmailHtml(locale, content),
    };
    await this.client.send(message);
  }
}
