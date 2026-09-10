import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SendMailOptions } from 'nodemailer';

import { SmtpEmailSender, type SmtpTransport } from './smtp-email-sender.js';

class FakeSmtpTransport implements SmtpTransport {
  public lastMessage: SendMailOptions | undefined;
  async sendMail(message: SendMailOptions): Promise<unknown> {
    this.lastMessage = message;
    return { messageId: 'fake-message-id' };
  }
}

// I3 -- Notification email delivery: the local-dev Mailpit transport. Same
// template/content contract as SendGridEmailSender (shared ./templates/
// layer) -- these tests only prove the transport wiring itself, not the
// content, which sendgrid-email-sender.test.ts already covers exhaustively.
describe('SmtpEmailSender', () => {
  it('sends a real message through the SMTP transport with subject, text, and HTML', async () => {
    const transport = new FakeSmtpTransport();
    const sender = new SmtpEmailSender(transport, 'noreply@orivex.dev', 'https://orivex-eg.vercel.app');

    await sender.send('patient@example.com', 'appointment-confirmed', { scheduledAt: '2026-08-01T10:00:00.000Z' });

    const message = transport.lastMessage!;
    assert.equal(message.to, 'patient@example.com');
    assert.equal(message.from, 'noreply@orivex.dev');
    assert.equal(message.subject, 'Your Orivex appointment is confirmed');
    assert.match(String(message.text), /2026-08-01T10:00:00\.000Z/);
    assert.match(String(message.html), /<!doctype html>/i);
  });

  it('renders Arabic RTL content when locale is "ar"', async () => {
    const transport = new FakeSmtpTransport();
    const sender = new SmtpEmailSender(transport, 'noreply@orivex.dev');

    await sender.send('patient@example.com', 'prescription-signed', {}, 'ar');

    const message = transport.lastMessage!;
    assert.equal(message.subject, 'لديك وصفة طبية جديدة');
    assert.match(String(message.html), /dir="rtl"/);
  });

  it('falls back to a generic subject/body for an unknown template rather than throwing', async () => {
    const transport = new FakeSmtpTransport();
    const sender = new SmtpEmailSender(transport, 'noreply@orivex.dev');

    await sender.send('patient@example.com', 'some-future-template', { foo: 'bar' });

    const message = transport.lastMessage!;
    assert.equal(message.subject, 'some-future-template');
    assert.match(String(message.text), /"foo":"bar"/);
  });
});
