import type { Appointment } from '@/features/patient/api/types';
import type { NotificationEntry } from '@/features/notifications/api/types';
import type { DoctorPatientListItem, QueueEntry, UpcomingWorkItem } from '@/features/doctor/api/types';
import {
  DEMO_DOCTORS,
  DEMO_DOCTORS_WITH_NO_CANCELLATIONS,
  DEMO_PATIENTS,
  DEMO_PATIENTS_WITH_NO_APPOINTMENTS,
  DEMO_SUPER_ADMIN,
} from '@/mocks/demo-data/demo-people';
import { DEMO_SEED_ENABLED } from '@/mocks/demo-mode';
import { getDoctorByAccountId, setDoctorOperationalState } from '@/mocks/doctor-store';
import { getProfile as getPatientProfile, setPatientAppointments, setPatientDashboardState } from '@/mocks/patient-store';
import { setNotificationsForAccount } from '@/mocks/notifications-store';
import { listSpecialties } from '@/mocks/reference-store';

/**
 * Demo Data & Profile Avatar Pass -- the one place the account-keyed stores
 * are actually filled with a coherent, cross-referencing demo history.
 *
 * Everything here is derived, never hand-transcribed twice: appointments are
 * built from the real seeded `DoctorProfile`s/`PatientProfile`s, each
 * doctor's dashboard aggregates are computed from the appointments that
 * genuinely reference them, and each account's notifications describe events
 * that genuinely exist in its own data. Two deliberate empty states are
 * honored exactly: `DEMO_PATIENTS_WITH_NO_APPOINTMENTS` end up with a
 * genuinely zero history, and `DEMO_DOCTORS_WITH_NO_CANCELLATIONS` never
 * accumulate a cancelled appointment.
 *
 * Runs once at module load, and only outside the test environment (see
 * `demo-mode.ts` for why).
 */
const DAY_MS = 86_400_000;

const REASONS = [
  'Follow-up on ongoing treatment',
  'Persistent anxiety and sleep difficulty',
  'Medication review',
  'Initial consultation',
  'Routine check-up',
  'Symptoms worsening over the past two weeks',
  'Second opinion on a recent diagnosis',
  'Post-treatment review',
];

function isoOffsetDays(days: number, hour: number): string {
  const date = new Date(Date.now() + days * DAY_MS);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

/** Deterministic pseudo-randomness: the demo must look the same on every reload, so no `Math.random()` anywhere in this file. */
function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

export function seedDemoData(): void {
  if (!DEMO_SEED_ENABLED) return;

  const specialtiesById = new Map(listSpecialties().map((specialty) => [specialty.id, specialty]));
  const doctors = DEMO_DOCTORS.map((demo) => {
    const profile = getDoctorByAccountId(demo.accountId);
    return profile ? { demo, profile } : null;
  }).filter((entry): entry is { demo: (typeof DEMO_DOCTORS)[number]; profile: NonNullable<ReturnType<typeof getDoctorByAccountId>> } => entry !== null);

  if (doctors.length === 0) return;

  const psychiatrists = doctors.filter((entry) => entry.demo.specialtyName === 'Psychiatry');
  const others = doctors.filter((entry) => entry.demo.specialtyName !== 'Psychiatry');
  const appointmentsByDoctorAccountId = new Map<string, { appointment: Appointment; patientName: string; patientAvatarUrl?: string }[]>();

  let appointmentSeq = 0;

  DEMO_PATIENTS.forEach((patient, patientIndex) => {
    if (DEMO_PATIENTS_WITH_NO_APPOINTMENTS.has(patient.email)) {
      // A genuine empty state: nothing seeded at all, so the real
      // "no appointments yet" UI is what a demo viewer sees.
      return;
    }

    const patientProfile = getPatientProfile(patient.accountId);
    if (!patientProfile) return;

    // Psychiatry-weighted: two of every three bookings land on a
    // psychiatrist, which is what makes Psychiatry dominate the demo's
    // Popular/Browse Doctors surfaces without any hardcoded "popular" flag.
    const bookingCount = 2 + (patientIndex % 4);
    const appointments: Appointment[] = [];

    for (let index = 0; index < bookingCount; index += 1) {
      const usePsychiatrist = psychiatrists.length > 0 && (index + patientIndex) % 3 !== 2;
      const pool = usePsychiatrist ? psychiatrists : others.length > 0 ? others : psychiatrists;
      const { demo, profile } = pick(pool, patientIndex * 5 + index);
      const specialty = specialtiesById.get(profile.specialtyId);

      const isUpcoming = index === 0 && patientIndex % 3 !== 1;
      const canCancel = !DEMO_DOCTORS_WITH_NO_CANCELLATIONS.has(demo.email);
      const status: Appointment['status'] = isUpcoming
        ? patientIndex % 4 === 0
          ? 'requested'
          : 'confirmed'
        : canCancel && index === bookingCount - 1 && patientIndex % 5 === 0
          ? 'cancelled'
          : index === bookingCount - 1 && patientIndex % 7 === 0
            ? 'rescheduled'
            : 'completed';

      appointmentSeq += 1;
      const dayOffset = isUpcoming ? 2 + (index + patientIndex) % 12 : -(7 * index + (patientIndex % 9) + 3);
      const isPaid = (demo.consultationFeeAmount ?? 0) > 0;
      const appointment: Appointment = {
        id: `appointment-demo-${appointmentSeq}`,
        scheduledAt: isoOffsetDays(dayOffset, 9 + ((index + patientIndex) % 8)),
        doctorId: profile.id,
        doctorName: profile.fullName,
        doctorAvatarUrl: profile.avatarUrl,
        specialization: specialty?.name ?? demo.specialtyName,
        specializationAr: specialty?.nameAr ?? null,
        status,
        consultationType: isPaid ? 'paid' : 'free',
        reasonForVisit: pick(REASONS, patientIndex + index),
        consultationSessionId: status === 'completed' || status === 'confirmed' ? `session-demo-a${appointmentSeq}` : null,
        paymentRequired: isPaid && status === 'requested',
        feeAmount: isPaid ? { amount: demo.consultationFeeAmount as number, currency: 'EGP' } : null,
      };

      appointments.push(appointment);
      const existing = appointmentsByDoctorAccountId.get(demo.accountId) ?? [];
      existing.push({ appointment, patientName: patientProfile.fullName, patientAvatarUrl: patientProfile.avatarUrl });
      appointmentsByDoctorAccountId.set(demo.accountId, existing);
    }

    setPatientAppointments(patient.accountId, appointments);

    const upcoming = appointments.filter((entry) => entry.status === 'confirmed' || entry.status === 'requested');
    const completed = appointments.filter((entry) => entry.status === 'completed');
    setPatientDashboardState(patient.accountId, {
      summary: {
        upcomingAppointmentsCount: upcoming.length,
        activePrescriptionsCount: completed.length > 0 ? 1 + (patientIndex % 2) : 0,
        lastVisitAt: completed[0]?.scheduledAt,
      },
      upcomingAppointments: upcoming.map((entry) => ({
        id: entry.id,
        scheduledAt: entry.scheduledAt,
        doctorName: entry.doctorName,
        doctorAvatarUrl: entry.doctorAvatarUrl,
        specialization: entry.specialization,
        specializationAr: entry.specializationAr,
        status: 'upcoming' as const,
      })),
      activePrescriptions:
        completed.length > 0
          ? [
              {
                id: `prescription-demo-${patientIndex + 1}`,
                medicationName: pick(['Sertraline', 'Escitalopram', 'Metformin', 'Amlodipine', 'Cetirizine'], patientIndex),
                dosageLabel: pick(['50mg, once daily', '10mg, once daily', '500mg, twice daily'], patientIndex),
                prescribedBy: completed[0].doctorName,
                status: 'active' as const,
              },
            ]
          : [],
    });

    setNotificationsForAccount(patient.accountId, patientNotifications(patient.accountId, appointments, patientIndex));
  });

  // Each doctor's own dashboard/queue/roster/report aggregates, computed
  // from the appointments that genuinely reference them above -- never a
  // separately invented set of numbers that could disagree with the list.
  for (const { demo, profile } of doctors) {
    const owned = appointmentsByDoctorAccountId.get(demo.accountId) ?? [];
    const today = owned.filter((entry) => isToday(entry.appointment.scheduledAt));
    const completedToday = today.filter((entry) => entry.appointment.status === 'completed');
    const pendingToday = today.filter(
      (entry) => entry.appointment.status === 'confirmed' || entry.appointment.status === 'requested',
    );

    const upcomingWork: UpcomingWorkItem[] = owned
      .slice(0, 12)
      .map(({ appointment, patientName, patientAvatarUrl }, index) => ({
        id: `upcoming-work-demo-${profile.id}-${index + 1}`,
        scheduledAt: appointment.scheduledAt,
        title: patientName,
        avatarUrl: patientAvatarUrl,
        description: appointment.reasonForVisit,
        status:
          appointment.status === 'completed'
            ? ('completed' as const)
            : appointment.status === 'cancelled'
              ? ('cancelled' as const)
              : ('upcoming' as const),
      }))
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

    const queue: QueueEntry[] = pendingToday.slice(0, 4).map(({ patientName, patientAvatarUrl }, index) => ({
      id: `queue-demo-${profile.id}-${index + 1}`,
      label: patientName,
      avatarUrl: patientAvatarUrl,
      status: index === 0 ? ('in-consultation' as const) : ('waiting' as const),
      position: index,
      estimatedWaitMinutes: index === 0 ? undefined : index * 13,
    }));

    const patientsByName = new Map<string, DoctorPatientListItem>();
    owned.forEach(({ appointment, patientName, patientAvatarUrl }, index) => {
      const existing = patientsByName.get(patientName);
      if (existing) {
        existing.visitCount += 1;
        return;
      }
      patientsByName.set(patientName, {
        patientProfileId: `patient-of-${profile.id}-${index + 1}`,
        patientName,
        avatarUrl: patientAvatarUrl,
        email: `${patientName.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
        phoneNumber: `+20 11${(index + 10).toString().padStart(2, '0')} 000 0000`,
        gender: index % 2 === 0 ? 'male' : 'female',
        visitCount: 1,
        lastVisitAt: appointment.scheduledAt,
        lastVisitStatus: appointment.status === 'cancelled' ? 'cancelled' : 'completed',
        hasFollowUpRecommendation: index % 4 === 0,
      });
    });

    const confirmed = owned.filter((entry) => entry.appointment.status === 'confirmed').length;
    const completed = owned.filter((entry) => entry.appointment.status === 'completed').length;
    const cancelled = owned.filter((entry) => entry.appointment.status === 'cancelled').length;

    setDoctorOperationalState(demo.accountId, {
      summary: {
        consultationsToday: pendingToday.length,
        patientsInQueue: queue.filter((entry) => entry.status === 'waiting').length,
        completedToday: completedToday.length,
      },
      upcomingWork,
      queue,
      patients: [...patientsByName.values()],
      reportsSummary: {
        totalAppointments: confirmed + completed + cancelled,
        confirmed,
        completed,
        cancelled,
        noShow: 0,
        // Left null here on purpose: the doctor's real rating aggregate
        // lives in `consultation-store.ts` (the reviews the demo actually
        // seeded), and duplicating a second, possibly-disagreeing number
        // onto the reports page would be exactly the kind of fabrication
        // this mock layer avoids.
        averageRating: null,
        reviewCount: 0,
      },
    });

    setNotificationsForAccount(demo.accountId, doctorNotifications(profile.id, owned, demo.verification));
  }

  setNotificationsForAccount(DEMO_SUPER_ADMIN.accountId, adminNotifications());
}

function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  );
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function patientNotifications(accountId: string, appointments: Appointment[], seed: number): NotificationEntry[] {
  const entries: NotificationEntry[] = [];
  const confirmed = appointments.find((entry) => entry.status === 'confirmed');
  const completed = appointments.find((entry) => entry.status === 'completed');
  const cancelled = appointments.find((entry) => entry.status === 'cancelled');

  if (confirmed) {
    entries.push({
      id: `notification-${accountId}-confirmed`,
      title: 'Appointment confirmed',
      description: `Your appointment with ${confirmed.doctorName} is confirmed.`,
      severity: 'success',
      createdAt: hoursAgo(3),
      read: false,
    });
  }
  if (completed) {
    entries.push({
      id: `notification-${accountId}-completed`,
      title: 'Consultation completed',
      description: `Your consultation with ${completed.doctorName} is complete. Rate your doctor to help other patients.`,
      severity: 'info',
      createdAt: hoursAgo(26),
      read: seed % 2 === 0,
    });
    entries.push({
      id: `notification-${accountId}-payment`,
      title: 'Payment successful',
      description: `Your payment for the consultation with ${completed.doctorName} was processed successfully.`,
      severity: 'success',
      createdAt: hoursAgo(27),
      read: true,
    });
  }
  if (cancelled) {
    entries.push({
      id: `notification-${accountId}-cancelled`,
      title: 'Appointment cancelled',
      description: `Your appointment with ${cancelled.doctorName} was cancelled.`,
      severity: 'danger',
      createdAt: hoursAgo(70),
      read: true,
    });
  }
  entries.push({
    id: `notification-${accountId}-verification`,
    title: 'Identity verification approved',
    description: 'Your identity verification was approved. You can now book consultations.',
    severity: 'success',
    createdAt: hoursAgo(24 * 9),
    read: true,
  });
  return entries;
}

function doctorNotifications(
  doctorProfileId: string,
  owned: { appointment: Appointment; patientName: string }[],
  verification: 'approved' | 'pending' | 'rejected',
): NotificationEntry[] {
  const entries: NotificationEntry[] = [];
  const requested = owned.find((entry) => entry.appointment.status === 'requested');
  const completed = owned.find((entry) => entry.appointment.status === 'completed');

  if (requested) {
    entries.push({
      id: `notification-${doctorProfileId}-request`,
      title: 'New appointment request',
      description: `${requested.patientName} requested a consultation. Review it in your queue.`,
      severity: 'info',
      createdAt: hoursAgo(2),
      read: false,
    });
  }
  if (completed) {
    entries.push({
      id: `notification-${doctorProfileId}-rated`,
      title: 'A patient rated your consultation',
      description: `${completed.patientName} left feedback on a recent consultation.`,
      severity: 'success',
      createdAt: hoursAgo(20),
      read: false,
    });
  }
  entries.push(
    verification === 'approved'
      ? {
          id: `notification-${doctorProfileId}-verification`,
          title: 'Verification approved',
          description: 'Your professional verification was approved. Your profile is now visible to patients.',
          severity: 'success',
          createdAt: hoursAgo(24 * 12),
          read: true,
        }
      : verification === 'pending'
        ? {
            id: `notification-${doctorProfileId}-verification`,
            title: 'Verification under review',
            description: 'Your professional verification application is being reviewed.',
            severity: 'info',
            createdAt: hoursAgo(24 * 3),
            read: false,
          }
        : {
            id: `notification-${doctorProfileId}-verification`,
            title: 'Verification rejected',
            description: 'Your verification was rejected. Re-upload a clearer copy of your licence to resubmit.',
            severity: 'danger',
            createdAt: hoursAgo(24 * 4),
            read: false,
          },
  );
  return entries;
}

function adminNotifications(): NotificationEntry[] {
  return [
    {
      id: 'notification-admin-queue',
      title: 'Verification cases awaiting review',
      description: 'New doctor and patient verification cases are pending review in the queue.',
      severity: 'warning',
      createdAt: hoursAgo(1),
      read: false,
    },
    {
      id: 'notification-admin-security',
      title: 'Security digest',
      description: 'No unusual sign-in activity was detected in the past 24 hours.',
      severity: 'info',
      createdAt: hoursAgo(12),
      read: true,
    },
  ];
}
