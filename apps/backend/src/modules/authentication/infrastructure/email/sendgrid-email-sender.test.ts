import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ClientResponse, MailDataRequired } from '@sendgrid/mail';

import { SendGridEmailSender, type SendGridClient } from './sendgrid-email-sender.js';

class FakeSendGridClient implements SendGridClient {
  public lastMessage: MailDataRequired | MailDataRequired[] | undefined;
  async send(data: MailDataRequired | MailDataRequired[]): Promise<[ClientResponse, object]> {
    this.lastMessage = data;
    return [{ statusCode: 202 } as ClientResponse, {}];
  }
}

describe('SendGridEmailSender', () => {
  it('sends an email-verification message with the token embedded in the body', async () => {
    const client = new FakeSendGridClient();
    const sender = new SendGridEmailSender(client, 'noreply@orivex.dev');

    await sender.send('patient@example.com', 'email-verification', { token: 'verify-token-123' });

    const message = client.lastMessage as MailDataRequired;
    assert.equal(message.to, 'patient@example.com');
    assert.equal(message.from, 'noreply@orivex.dev');
    assert.equal(message.subject, 'Verify your Orivex email address');
    assert.match(String(message.text), /verify-token-123/);
  });

  it('sends a clickable verify-email link instead of a bare token when frontendUrl is known', async () => {
    const client = new FakeSendGridClient();
    const sender = new SendGridEmailSender(client, 'noreply@orivex.dev', 'https://orivex-eg.vercel.app');

    await sender.send('patient@example.com', 'email-verification', { token: 'verify-token-123' });

    const message = client.lastMessage as MailDataRequired;
    assert.match(String(message.text), /https:\/\/orivex-eg\.vercel\.app\/verify-email\?token=verify-token-123/);
  });

  it('sends a clickable reset-password link instead of a bare token when frontendUrl is known', async () => {
    const client = new FakeSendGridClient();
    const sender = new SendGridEmailSender(client, 'noreply@orivex.dev', 'https://orivex-eg.vercel.app');

    await sender.send('patient@example.com', 'password-reset', { token: 'reset-token-456' });

    const message = client.lastMessage as MailDataRequired;
    assert.match(String(message.text), /https:\/\/orivex-eg\.vercel\.app\/reset-password\?token=reset-token-456/);
  });

  it('sends a password-reset message with the token embedded in the body', async () => {
    const client = new FakeSendGridClient();
    const sender = new SendGridEmailSender(client, 'noreply@orivex.dev');

    await sender.send('patient@example.com', 'password-reset', { token: 'reset-token-456' });

    const message = client.lastMessage as MailDataRequired;
    assert.equal(message.subject, 'Reset your Orivex password');
    assert.match(String(message.text), /reset-token-456/);
  });

  it('sends an appointment-reminder message with the scheduled time embedded in the body', async () => {
    const client = new FakeSendGridClient();
    const sender = new SendGridEmailSender(client, 'noreply@orivex.dev');

    await sender.send('patient@example.com', 'appointment-reminder', { scheduledAt: '2026-08-01T10:00:00.000Z' });

    const message = client.lastMessage as MailDataRequired;
    assert.equal(message.subject, 'Upcoming Orivex appointment reminder');
    assert.match(String(message.text), /2026-08-01T10:00:00\.000Z/);
  });

  it('falls back to a generic subject/body for an unknown template rather than throwing', async () => {
    const client = new FakeSendGridClient();
    const sender = new SendGridEmailSender(client, 'noreply@orivex.dev');

    await sender.send('patient@example.com', 'some-future-template', { foo: 'bar' });

    const message = client.lastMessage as MailDataRequired;
    assert.equal(message.subject, 'some-future-template');
    assert.match(String(message.text), /"foo":"bar"/);
  });

  // I3 -- Notification email delivery: every send now also carries a real
  // HTML body (never just plain text) built from the shared template layer.
  it('always includes an HTML body alongside the plain-text one', async () => {
    const client = new FakeSendGridClient();
    const sender = new SendGridEmailSender(client, 'noreply@orivex.dev', 'https://orivex-eg.vercel.app');

    await sender.send('patient@example.com', 'appointment-confirmed', { scheduledAt: '2026-08-01T10:00:00.000Z' });

    const message = client.lastMessage as MailDataRequired;
    assert.match(String(message.html), /<!doctype html>/i);
    assert.match(String(message.html), /2026-08-01T10:00:00\.000Z/);
    assert.match(String(message.html), /View appointment/);
  });

  it('sends a review-request (consultation-completed) message, PHI-light, with no clinical detail', async () => {
    const client = new FakeSendGridClient();
    const sender = new SendGridEmailSender(client, 'noreply@orivex.dev', 'https://orivex-eg.vercel.app');

    await sender.send('patient@example.com', 'consultation-completed', {});

    const message = client.lastMessage as MailDataRequired;
    assert.equal(message.subject, 'How was your Orivex consultation?');
    assert.match(String(message.text), /rate your experience/i);
    assert.doesNotMatch(String(message.text), /diagnosis|prescription|medication/i);
  });

  it('renders Arabic content with a real RTL HTML document when locale is "ar"', async () => {
    const client = new FakeSendGridClient();
    const sender = new SendGridEmailSender(client, 'noreply@orivex.dev', 'https://orivex-eg.vercel.app');

    await sender.send('patient@example.com', 'appointment-confirmed', { scheduledAt: '2026-08-01T10:00:00.000Z' }, 'ar');

    const message = client.lastMessage as MailDataRequired;
    assert.equal(message.subject, 'تم تأكيد موعدك في أوريفكس');
    assert.match(String(message.html), /dir="rtl"/);
    assert.match(String(message.html), /lang="ar"/);
  });

  it('defaults to English (unchanged) when no locale is passed', async () => {
    const client = new FakeSendGridClient();
    const sender = new SendGridEmailSender(client, 'noreply@orivex.dev');

    await sender.send('patient@example.com', 'appointment-confirmed', { scheduledAt: '2026-08-01T10:00:00.000Z' });

    const message = client.lastMessage as MailDataRequired;
    assert.equal(message.subject, 'Your Orivex appointment is confirmed');
    assert.match(String(message.html), /dir="ltr"/);
  });
});
