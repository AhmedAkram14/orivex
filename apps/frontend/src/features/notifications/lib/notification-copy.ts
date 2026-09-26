import type { useFormatter, useTranslations } from 'next-intl';
import type { NotificationEntry } from '@/features/notifications/api/types';

type Formatter = ReturnType<typeof useFormatter>;
type Translator = ReturnType<typeof useTranslations>;

/**
 * The backend composes notification titles/bodies as fixed English strings.
 * This maps each known title to an i18n key so the UI renders them in the
 * viewer's language and with audience-appropriate wording, without touching
 * the backend. Unknown titles fall back to the raw server text (never hidden).
 */
const TITLE_TO_KEY: Record<string, string> = {
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
};

const ISO = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/;
const AMOUNT = /(\d+(?:\.\d+)?)\s+([A-Z]{3})\b/;

type Audience = 'patient' | 'doctor' | 'shared';

function audienceOf(entry: NotificationEntry): Audience {
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
 * `useTranslations('notificationCopy')`. A patient-flavoured notification
 * reaching a doctor's account (a doctor who also books as a patient) is
 * prefixed "As a patient:" so a doctor never reads "your appointment
 * request expired" as if it were about their practice.
 */
export function localizeNotification(
  entry: NotificationEntry,
  t: Translator,
  format: Formatter,
  viewerIsDoctor: boolean,
): LocalizedNotificationText {
  const key = TITLE_TO_KEY[entry.title];
  if (!key) return { title: entry.title, description: entry.description };

  const audience = audienceOf(entry);
  const has = (path: string) => t.has(path);

  const iso = ISO.exec(entry.description)?.[0];
  const when = iso && !Number.isNaN(new Date(iso).getTime()) ? format.dateTime(new Date(iso), { dateStyle: 'medium', timeStyle: 'short' }) : undefined;
  const money = AMOUNT.exec(entry.description);
  const amount = money ? `${money[1]} ${money[2]}` : undefined;

  let body: string;
  if (audience === 'doctor' && has(`${key}.doctor`)) body = t(`${key}.doctor`);
  else if (audience === 'patient' && has(`${key}.patient`)) body = t(`${key}.patient`);
  else if (when && has(`${key}.anyWhen`)) body = t(`${key}.anyWhen`, { when });
  else if (amount && has(`${key}.anyAmount`)) body = t(`${key}.anyAmount`, { amount });
  else if (has(`${key}.any`)) body = t(`${key}.any`);
  else if (has(`${key}.patient`)) body = t(`${key}.patient`);
  else body = t(`${key}.doctor`);

  const patientFlavoured = audience === 'patient' || (audience === 'shared' && !has(`${key}.doctor`) && has(`${key}.patient`));
  const prefix = viewerIsDoctor && patientFlavoured ? t('audienceAsPatient') : '';

  return { title: t(`${key}.title`), description: `${prefix}${body}` };
}
