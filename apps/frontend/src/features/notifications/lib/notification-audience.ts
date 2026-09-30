import type { NotificationEntry } from '@/features/notifications/api/types';
import { notificationAudience, notificationTypeKey, type NotificationTypeKey } from '@/features/notifications/lib/notification-copy';

/**
 * Who each notification type is about, decided per type in this one place.
 *
 *   clinical -- about the doctor's practice (only ever sent to a doctor);
 *   personal -- about the reader's own care (only ever sent to a patient);
 *   account  -- about the account itself (sign-in, security, verification), neither of the above;
 *   either   -- the same type is sent to both sides of an appointment or dispute, so the type alone
 *               can't tell; only these fall back to the notification's link.
 *
 * Grounded in the backend's own senders (apps/backend/src/modules/notification). When the backend
 * adds a notification type, add it here: an unknown type also falls back to the link.
 */
export const NOTIFICATION_AUDIENCE: Record<NotificationTypeKey, 'clinical' | 'personal' | 'account' | 'either'> = {
  // Doctor only
  newAppointmentRequest: 'clinical', // notify-doctor-of-appointment-requested
  patientCheckedIn: 'clinical', // notify-doctor-of-appointment-confirmed
  newReview: 'clinical', // notify-doctor-of-consultation-feedback-submitted
  // Patient only
  appointmentApproved: 'personal', // notify-patient-of-appointment-confirmed
  appointmentDeclined: 'personal', // notify-patient-of-appointment-declined
  appointmentExpired: 'personal', // notify-patient-of-appointment-expired
  appointmentReminder: 'personal', // send-appointment-reminder (patient's account)
  consultationCompleted: 'personal', // notify-consultation-completed (patient's account)
  paymentReceived: 'personal', // notify-patient-of-payment-completed
  newPrescription: 'personal', // notify-patient-of-prescription-signed
  refundIssued: 'personal', // notify-patient-of-refund-issued
  slotOpened: 'personal', // notify-patient-of-waitlist-opportunity
  // Sent to both parties under the same title
  appointmentCancelled: 'either',
  appointmentRescheduled: 'either',
  consultationInterrupted: 'either',
  disputeRaised: 'either',
  disputeWithdrawn: 'either',
  disputeDismissed: 'either',
  disputeResolved: 'either',
  // The account itself
  welcome: 'account',
  welcomeDoctor: 'account',
  accountLocked: 'account',
  passwordChanged: 'account',
  verificationApproved: 'account',
  verificationRejected: 'account',
  verificationMoreInfo: 'account',
  verificationSuspended: 'account',
  verificationSubmitted: 'account',
};

/**
 * A notification about the reader's OWN care reaching an account that also practises as a doctor
 * (a doctor who books as a patient). Kept out of the clinical feed and shown under "Personal".
 * Decided by type first; only a type sent to both sides (or one not in the table yet) falls back
 * to whether its link points into the patient workspace.
 */
export function isPersonalNotification(entry: NotificationEntry, viewerIsDoctor: boolean): boolean {
  if (!viewerIsDoctor) return false;
  const key = notificationTypeKey(entry);
  const audience = key ? NOTIFICATION_AUDIENCE[key] : undefined;
  if (audience === 'personal') return true;
  if (audience === 'clinical' || audience === 'account') return false;
  return notificationAudience(entry) === 'patient';
}
