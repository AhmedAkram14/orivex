import type { useFormatter, useTranslations } from 'next-intl';
import type { NotificationEntry } from '@/features/notifications/api/types';
import { formatCurrency } from '@/shared/lib/currency/format-currency';

type Formatter = ReturnType<typeof useFormatter>;
type Translator = ReturnType<typeof useTranslations>;

/**
 * The backend composes notification titles/bodies as fixed English strings.
 * This maps each known title to an i18n key so the UI renders them in the
 * viewer's language and with audience-appropriate wording, without touching
 * the backend. Unknown titles fall back to the raw server text (never hidden).
 */
const TITLE_TO_KEY = {
  'Appointment cancelled': 'appointmentCancelled',
  'Appointment approved': 'appointmentApproved',
  'Appointment request declined': 'appointmentDeclined',
  'Appointment request expired': 'appointmentExpired',
  'Appointment rescheduled': 'appointmentRescheduled',
  'Upcoming appointment reminder': 'appointmentReminder',
  'New appointment request': 'newAppointmentRequest',
  'Patient checked in': 'patientCheckedIn',
  'New consultation review': 'newReview',
  'Consultation completed': 'consultationCompleted',
  'Consultation interrupted': 'consultationInterrupted',
  'A dispute was raised': 'disputeRaised',
  'Dispute withdrawn': 'disputeWithdrawn',
  'Dispute dismissed': 'disputeDismissed',
  'Dispute resolved': 'disputeResolved',
  'Payment received': 'paymentReceived',
  'Refund issued': 'refundIssued',
  'New prescription': 'newPrescription',
  'A slot just opened up': 'slotOpened',
  'Welcome to Orivex': 'welcome',
  'Welcome, Doctor': 'welcomeDoctor',
  'Account temporarily locked': 'accountLocked',
  'Password changed': 'passwordChanged',
  'Verification approved': 'verificationApproved',
  'Verification suspended': 'verificationSuspended',
} as const satisfies Record<string, string>;

export type NotificationTypeKey = (typeof TITLE_TO_KEY)[keyof typeof TITLE_TO_KEY];

/** The notification's type, from the backend's fixed English title (the API has no separate type field). Undefined for a title this app doesn't know yet. */
export function notificationTypeKey(entry: NotificationEntry): NotificationTypeKey | undefined {
  return (TITLE_TO_KEY as Record<string, NotificationTypeKey>)[entry.title];
}

const ISO = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/;
const AMOUNT = /(\d+(?:\.\d+)?)\s+([A-Z]{3})\b/;

export type NotificationAudience = 'patient' | 'doctor' | 'shared';

/**
 * Which workspace a notification's link points into (/patient or /doctor). Used to pick the
 * patient- or doctor-worded copy, and -- only as a fallback -- by `notification-audience.ts` for a
 * type the backend sends to both sides.
 */
export function notificationAudience(entry: NotificationEntry): NotificationAudience {
  const url = entry.actionUrl ?? '';
  if (url.startsWith('/patient')) return 'patient';
  if (url.startsWith('/doctor')) return 'doctor';
  return 'shared';
}

export interface LocalizedNotificationText {
  title: string;
  description: string;
}

/**
 * Localized, audience-appropriate title and body. `t` is
 * `useTranslations('notificationCopy')`. Money is formatted with the active
 * locale's currency formatter, so it reads the same as every other amount.
 */
export function localizeNotification(
  entry: NotificationEntry,
  t: Translator,
  format: Formatter,
): LocalizedNotificationText {
  const key = notificationTypeKey(entry);
  if (!key) return { title: entry.title, description: entry.description };

  const audience = notificationAudience(entry);
  const has = (path: string) => t.has(path);

  const iso = ISO.exec(entry.description)?.[0];
  const when = iso && !Number.isNaN(new Date(iso).getTime()) ? format.dateTime(new Date(iso), { dateStyle: 'medium', timeStyle: 'short' }) : undefined;
  const money = AMOUNT.exec(entry.description);
  const amount = money ? formatCurrency(format, Number(money[1]), money[2]) : undefined;

  let body: string;
  if (audience === 'doctor' && has(`${key}.doctor`)) body = t(`${key}.doctor`);
  else if (audience === 'patient' && has(`${key}.patient`)) body = t(`${key}.patient`);
  else if (when && has(`${key}.anyWhen`)) body = t(`${key}.anyWhen`, { when });
  else if (amount && has(`${key}.anyAmount`)) body = t(`${key}.anyAmount`, { amount });
  else if (has(`${key}.any`)) body = t(`${key}.any`);
  else if (has(`${key}.patient`)) body = t(`${key}.patient`);
  else body = t(`${key}.doctor`);

  return { title: t(`${key}.title`), description: body };
}
