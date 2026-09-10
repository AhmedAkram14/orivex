import type { EmailLocale } from './email-locale.js';

export interface EmailCallToAction {
  label: string;
  url: string;
}

export interface EmailContent {
  subject: string;
  text: string;
  cta?: EmailCallToAction;
}

type TemplateBuilder = (data: Record<string, unknown>, frontendUrl: string | undefined) => EmailContent;

// I3 -- Notification email delivery (docs/01-prd.md §2.12: "SMS/email/push/
// in-app for booking confirmations, reminders, cancellations, prescription
// ready, review requests"). One builder per template, in English and
// Arabic -- deliberately PHI-light throughout (no reason for visit,
// diagnosis, medication name/dosage, or clinical note content in any of
// these; a secure link back to the authenticated product is how the
// recipient gets the real detail). Subjects/text preserved verbatim for the
// pre-existing English templates (email-verification, password-reset,
// appointment-reminder, appointment-confirmed, appointment-cancelled,
// prescription-signed) -- this file only relocates them out of the
// transport adapter, plus adds Arabic and the new consultation-completed
// ("review request") template.
const EN: Record<string, TemplateBuilder> = {
  'email-verification': (data, frontendUrl) => {
    const token = String(data.token);
    return frontendUrl
      ? {
          subject: 'Verify your Orivex email address',
          text: `Verify your email address by opening this link: ${frontendUrl}/verify-email?token=${token}`,
          cta: { label: 'Verify email address', url: `${frontendUrl}/verify-email?token=${token}` },
        }
      : {
          subject: 'Verify your Orivex email address',
          text: `Use this code to verify your email address: ${token}`,
        };
  },
  'password-reset': (data, frontendUrl) => {
    const token = String(data.token);
    return frontendUrl
      ? {
          subject: 'Reset your Orivex password',
          text: `Reset your password by opening this link: ${frontendUrl}/reset-password?token=${token}`,
          cta: { label: 'Reset password', url: `${frontendUrl}/reset-password?token=${token}` },
        }
      : {
          subject: 'Reset your Orivex password',
          text: `Use this code to reset your password: ${token}`,
        };
  },
  'appointment-reminder': (data) => ({
    subject: 'Upcoming Orivex appointment reminder',
    text: `You have an upcoming appointment scheduled for ${String(data.scheduledAt)}.`,
  }),
  'appointment-confirmed': (data, frontendUrl) => ({
    subject: 'Your Orivex appointment is confirmed',
    text: `Your doctor has approved your appointment request, scheduled for ${String(data.scheduledAt)}.`,
    cta: frontendUrl ? { label: 'View appointment', url: `${frontendUrl}/patient/appointments` } : undefined,
  }),
  'appointment-cancelled': (data, frontendUrl) => ({
    subject: 'Your Orivex appointment was cancelled',
    text:
      data.cancelledBy === 'doctor'
        ? 'Your doctor cancelled your appointment. Any payment made will be refunded automatically.'
        : 'Your appointment has been cancelled. Any payment made will be refunded automatically.',
    cta: frontendUrl ? { label: 'View appointments', url: `${frontendUrl}/patient/appointments` } : undefined,
  }),
  'prescription-signed': (_data, frontendUrl) => ({
    subject: 'You have a new prescription',
    text: 'Your doctor has signed a new prescription for you. Log in to Orivex to view it.',
    cta: frontendUrl ? { label: 'View prescription', url: `${frontendUrl}/patient/prescriptions` } : undefined,
  }),
  // New for I3 -- the PRD's "review requests" email type. Matches
  // NotifyConsultationCompletedHandler's own in-app notification (a
  // prescription/follow-up mention lives there) but deliberately does not
  // repeat that detail here, keeping the email itself PHI-light.
  'consultation-completed': (_data, frontendUrl) => ({
    subject: 'How was your Orivex consultation?',
    text: 'Your consultation is complete. Log in to Orivex to rate your experience and see any next steps your doctor recommended.',
    cta: frontendUrl ? { label: 'Rate your consultation', url: `${frontendUrl}/patient/appointments` } : undefined,
  }),
};

const AR: Record<string, TemplateBuilder> = {
  'email-verification': (data, frontendUrl) => {
    const token = String(data.token);
    return frontendUrl
      ? {
          subject: 'تأكيد بريدك الإلكتروني في أوريفكس',
          text: `لتأكيد بريدك الإلكتروني، افتح هذا الرابط: ${frontendUrl}/verify-email?token=${token}`,
          cta: { label: 'تأكيد البريد الإلكتروني', url: `${frontendUrl}/verify-email?token=${token}` },
        }
      : {
          subject: 'تأكيد بريدك الإلكتروني في أوريفكس',
          text: `استخدم هذا الرمز لتأكيد بريدك الإلكتروني: ${token}`,
        };
  },
  'password-reset': (data, frontendUrl) => {
    const token = String(data.token);
    return frontendUrl
      ? {
          subject: 'إعادة تعيين كلمة مرور أوريفكس',
          text: `لإعادة تعيين كلمة المرور، افتح هذا الرابط: ${frontendUrl}/reset-password?token=${token}`,
          cta: { label: 'إعادة تعيين كلمة المرور', url: `${frontendUrl}/reset-password?token=${token}` },
        }
      : {
          subject: 'إعادة تعيين كلمة مرور أوريفكس',
          text: `استخدم هذا الرمز لإعادة تعيين كلمة المرور: ${token}`,
        };
  },
  'appointment-reminder': (data) => ({
    subject: 'تذكير بموعدك القادم في أوريفكس',
    text: `لديك موعد قادم في ${String(data.scheduledAt)}.`,
  }),
  'appointment-confirmed': (data, frontendUrl) => ({
    subject: 'تم تأكيد موعدك في أوريفكس',
    text: `وافق طبيبك على طلب حجزك، والموعد مقرر في ${String(data.scheduledAt)}.`,
    cta: frontendUrl ? { label: 'عرض المواعيد', url: `${frontendUrl}/patient/appointments` } : undefined,
  }),
  'appointment-cancelled': (data, frontendUrl) => ({
    subject: 'تم إلغاء موعدك في أوريفكس',
    text:
      data.cancelledBy === 'doctor'
        ? 'ألغى طبيبك موعدك. سيتم استرداد أي مبلغ مدفوع تلقائيًا.'
        : 'تم إلغاء موعدك. سيتم استرداد أي مبلغ مدفوع تلقائيًا.',
    cta: frontendUrl ? { label: 'عرض المواعيد', url: `${frontendUrl}/patient/appointments` } : undefined,
  }),
  'prescription-signed': (_data, frontendUrl) => ({
    subject: 'لديك وصفة طبية جديدة',
    text: 'وقّع طبيبك وصفة طبية جديدة لك. سجّل الدخول إلى أوريفكس للاطلاع عليها.',
    cta: frontendUrl ? { label: 'عرض الوصفة الطبية', url: `${frontendUrl}/patient/prescriptions` } : undefined,
  }),
  'consultation-completed': (_data, frontendUrl) => ({
    subject: 'كيف كانت استشارتك في أوريفكس؟',
    text: 'اكتملت استشارتك. سجّل الدخول إلى أوريفكس لتقييم تجربتك والاطلاع على أي خطوات تالية أوصى بها طبيبك.',
    cta: frontendUrl ? { label: 'قيّم استشارتك', url: `${frontendUrl}/patient/appointments` } : undefined,
  }),
};

/** Falls back to a generic subject/body for an unknown template rather than throwing -- matches the transport adapters' own pre-existing fallback exactly (subject = template name, text = JSON.stringify(data)), never locale-branched since it's a last resort, not real content. */
export function buildEmailContent(
  locale: EmailLocale,
  template: string,
  data: Record<string, unknown>,
  frontendUrl: string | undefined,
): EmailContent {
  const builder = (locale === 'ar' ? AR : EN)[template];
  if (!builder) {
    return { subject: template, text: JSON.stringify(data) };
  }
  return builder(data, frontendUrl);
}
