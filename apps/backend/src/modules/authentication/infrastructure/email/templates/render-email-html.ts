import type { EmailLocale } from './email-locale.js';
import type { EmailContent } from './email-content.js';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const FOOTER_TEXT: Record<EmailLocale, string> = {
  en: 'This is an automated message from the ORIVEX healthcare platform.',
  ar: 'هذه رسالة تلقائية من منصة أوريفكس الصحية.',
};

// I3 -- Notification email delivery. One small, reusable HTML shell for
// every transactional email template (no per-handler inline HTML strings).
// `dir`/`lang` flip for Arabic so mail clients render true RTL (text
// alignment, CTA placement) rather than an LTR shell with Arabic text
// awkwardly embedded. Deliberately plain, calm, table-based markup (inline
// styles only) -- this is the email-client-compatibility convention every
// transactional-email provider requires (no external stylesheet, no flex/
// grid), not a stylistic choice to skip.
export function renderEmailHtml(locale: EmailLocale, content: EmailContent): string {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const align = locale === 'ar' ? 'right' : 'left';

  const bodyHtml = content.text
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => `<p style="margin:0 0 16px 0;color:#1F2937;font-size:15px;line-height:1.6;">${escapeHtml(line)}</p>`)
    .join('');

  const ctaHtml = content.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0 0;"><tr><td style="border-radius:8px;background:#0F766E;">
        <a href="${escapeHtml(content.cta.url)}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(content.cta.label)}</a>
      </td></tr></table>`
    : '';

  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:24px 0;">
<tr>
<td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;max-width:480px;width:100%;overflow:hidden;">
<tr>
<td style="background-color:#0F766E;padding:20px 24px;text-align:${align};">
<span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.02em;">ORIVEX</span>
</td>
</tr>
<tr>
<td style="padding:28px 24px;text-align:${align};">
<h1 style="margin:0 0 16px 0;font-size:20px;color:#111827;">${escapeHtml(content.subject)}</h1>
${bodyHtml}
${ctaHtml}
</td>
</tr>
<tr>
<td style="padding:16px 24px;border-top:1px solid #E5E7EB;text-align:${align};">
<p style="margin:0;font-size:12px;color:#9CA3AF;">${escapeHtml(FOOTER_TEXT[locale])}</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}
