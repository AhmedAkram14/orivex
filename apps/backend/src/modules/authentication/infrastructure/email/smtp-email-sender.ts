import { Injectable } from '@nestjs/common';
import type { SendMailOptions } from 'nodemailer';

import type { EmailSenderPort } from '../../application/ports/email-sender.port.js';

import { buildEmailContent } from './templates/email-content.js';
import type { EmailLocale } from './templates/email-locale.js';
import { renderEmailHtml } from './templates/render-email-html.js';

// A single-signature slice of nodemailer's Transporter -- Transporter.sendMail
// is itself overloaded (a callback-style variant exists alongside the
// promise-returning one), which a hand-written fake can't cleanly implement
// against `Pick<Transporter, 'sendMail'>` directly. This plain interface is
// what nodemailer.createTransport(...)'s real return value already
// satisfies structurally, same narrowed-testable-slice convention as
// SendGridClient/StripeClient.
export interface SmtpTransport {
  sendMail(message: SendMailOptions): Promise<unknown>;
}

// I3 -- Notification email delivery: the local-dev real transport, routed
// through the already-provisioned Mailpit service
// (infrastructure/docker/docker-compose.yml) so email delivery is genuinely
// verifiable (http://localhost:8025) without a real SendGrid API key. Bound
// in authentication.module.ts only when SMTP_HOST is set AND SendGrid isn't
// configured -- SendGrid always wins when both are present. Shares the
// exact same template/HTML-rendering layer as SendGridEmailSender (no
// duplicated content), differing only in transport.
@Injectable()
export class SmtpEmailSender implements EmailSenderPort {
  constructor(
    private readonly transport: SmtpTransport,
    private readonly fromEmail: string,
    private readonly frontendUrl?: string,
  ) {}

  async send(to: string, template: string, data: Record<string, unknown>, locale: EmailLocale = 'en'): Promise<void> {
    const content = buildEmailContent(locale, template, data, this.frontendUrl);

    await this.transport.sendMail({
      to,
      from: this.fromEmail,
      subject: content.subject,
      text: content.text,
      html: renderEmailHtml(locale, content),
    });
  }
}
