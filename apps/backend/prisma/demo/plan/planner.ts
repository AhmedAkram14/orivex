/**
 * Demo timeline -- the planner. Pure: takes the demo population, an anchor
 * and the real prescription signer, returns every row the timeline owns.
 * No I/O happens here.
 *
 * Lifecycle mirrors the product's own rules (see the use cases referenced
 * inline): pay-then-confirm for paid slots, doctor approval for free ones,
 * full refund on any cancellation of a charged appointment and on a
 * reschedule of a confirmed one, no-show marked ~30 min after the slot by the
 * no-show sweep, and stale waiting-room sessions closed as
 * INTERRUPTED_TECHNICAL by the stale-session sweep.
 */
import type { SignPrescriptionContentRequest, SignPrescriptionContentResult } from '../../../src/modules/clinical/application/ports/prescription-signer.port.js';
import type { AllergyClass, ConditionSpec, Medication, Phase, VitalKind } from '../catalog/clinical.js';
import { CONDITIONS } from '../catalog/clinical.js';
import {
  ARTICLES,
  DISPUTES,
  DOCTOR_ENRICHMENT,
  FLAG_REASONS,
  HOSPITAL_ADDRESSES,
  MESSAGE_SCRIPTS,
  OFFENSIVE_REVIEW_COMMENTS,
  PATIENT_ENRICHMENT,
  REVIEW_COMMENTS,
  WAITLIST,
} from '../catalog/content.js';
import type { Episode, PinnedVisit } from '../catalog/stories.js';
import {
  DOCTOR_FOCUS,
  DOCTOR_RATING_MEAN,
  MIN_COMPLETED_PER_DOCTOR,
  MIN_UPCOMING_PER_DOCTOR,
  PARENT_PATIENTS,
  PATIENT_STORIES,
} from '../catalog/stories.js';
import type { CairoDay, Rng } from '../core.js';
import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE, addDays, cairoDayOf, cairoInstant, daysBetween, demoId, hhmmOf, plusMinutes, rng, utcMidnightOf } from '../core.js';
import type { DemoDoctorRecord, DemoPatientRecord, DemoPopulation } from '../load.js';

import type { Slot, SlotPolicy } from './schedule.js';
import { DoctorCalendar, PatientCalendar, compareDay, place } from './schedule.js';
import { composePediatricSoap, composeSoap, vitalsAt, vitalsProfileFor } from './soap.js';
import type { DemoPlan, DocumentFile, DocumentRender, Patch, TimelineRows } from './types.js';
import { emptyRows } from './types.js';

export type Signer = (request: SignPrescriptionContentRequest) => SignPrescriptionContentResult;

export interface ExistingIdentityAsset {
  id: string;
  ownerAccountId: string;
  purpose: string;
  storageKey: string;
  contentType: string;
}

export interface SeedNotification {
  id: string;
  accountId: string;
  title: string;
  actionUrl: string | null;
}

export interface PlannerInput {
  anchor: Date;
  population: DemoPopulation;
  sign: Signer;
  identityAssets: ExistingIdentityAsset[];
  seedNotifications: SeedNotification[];
  hospitals: { id: string; name: string; address: string | null }[];
  existingPortfolio: { doctorProfileId: string; title: string }[];
}

// ---------------------------------------------------------------------------
// Internal model
// ---------------------------------------------------------------------------
type ApptStatus = 'REQUESTED' | 'CONFIRMED' | 'RESCHEDULED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED' | 'EXPIRED';

interface EpisodeState {
  key: string;
  patient: DemoPatientRecord;
  doctor: DemoDoctorRecord;
  conditionKey: string;
  spec?: ConditionSpec;
  pediatric: boolean;
  plannedVisits: number;
  rootNodeId?: string;
  latestNodeId?: string;
  linkedNodeIds: string[];
  previousMeds: Medication[];
  firstTreatmentAt?: Date;
  labsOrdered: string[];
  completedCount: number;
  journeyCreatedAt?: Date;
  lastCompletedAt?: Date;
}

interface Appt {
  key: string;
  id: string;
  windowId: string;
  doctor: DemoDoctorRecord;
  patient: DemoPatientRecord;
  slot: Slot;
  day: CairoDay;
  status: ApptStatus;
  fee: number | null;
  bookedAt: Date;
  confirmedAt?: Date;
  statusChangedAt?: Date;
  cancelledBy?: 'patient' | 'doctor';
  declineReason?: string;
  rescheduledFromId?: string;
  paid: boolean;
  refundedAt?: Date;
  reason: string;
  appointmentType: 'NEW_PATIENT' | 'FOLLOW_UP' | 'CONSULTATION';
  episode: EpisodeState;
  visitIndex: number;
  /** COMPLETED appointments carry the clinical encounter. */
  clinical: boolean;
  sessionId?: string;
  startedAt?: Date;
  closedAt?: Date;
  adminRefund?: boolean;
}

type Disruption = 'patientCancel' | 'doctorCancel' | 'noShow' | 'reschedule' | 'declined' | 'expired';

/**
 * Deliberate disruptions on the reference accounts (doctor03 / patient03),
 * so their history shows each lifecycle state exactly once or twice rather
 * than by chance. Random disruptions are disabled on these pairs.
 */
const FORCED_DISRUPTIONS: { patient: string; doctor: string; visitIndex: number; kind: Disruption }[] = [
  { patient: 'patient03', doctor: 'doctor03', visitIndex: 5, kind: 'noShow' },
  { patient: 'patient03', doctor: 'doctor18', visitIndex: 1, kind: 'patientCancel' },
  { patient: 'patient03', doctor: 'doctor12', visitIndex: 1, kind: 'doctorCancel' },
  { patient: 'patient03', doctor: 'doctor03', visitIndex: 2, kind: 'reschedule' },
  { patient: 'patient10', doctor: 'doctor03', visitIndex: 1, kind: 'noShow' },
  { patient: 'patient02', doctor: 'doctor03', visitIndex: 2, kind: 'patientCancel' },
  { patient: 'patient16', doctor: 'doctor03', visitIndex: 3, kind: 'patientCancel' },
  { patient: 'patient13', doctor: 'doctor03', visitIndex: 0, kind: 'doctorCancel' },
  { patient: 'patient11', doctor: 'doctor03', visitIndex: 0, kind: 'expired' },
];
const REFERENCE_PAIRS = new Set(['doctor03', 'patient03']);

/** Upcoming bookings a doctor carries beyond the global floor (doctor03: a full fortnight for the dashboard and schedule). */
const UPCOMING_TARGET: Record<string, number> = { doctor03: 10 };
/** Free-priced check-in requests waiting in a paid doctor's Pending Approval. */
const FREE_CHECKIN_REQUESTS: Record<string, number> = { doctor03: 3 };

const DECLINE_REASONS = [
  'This slot is reserved for follow-up patients; please book one of the new-patient slots next week.',
  'Your concern needs an in-person examination; please book with a clinic nearby.',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const FOCUS_SPECIALTY_DURATION: Record<string, [number, number]> = {
  Psychiatry: [22, 30],
  Cardiology: [15, 25],
  Dermatology: [12, 20],
  Pediatrics: [12, 20],
  'Internal Medicine': [15, 25],
  Orthopedics: [15, 22],
  Dentistry: [10, 18],
  'Otolaryngology (ENT)': [12, 20],
  Ophthalmology: [10, 18],
};

function allergyClassesOf(patient: DemoPatientRecord, enrichmentAllergies?: string): Set<AllergyClass> {
  const text = `${patient.allergies ?? ''} ${enrichmentAllergies ?? ''}`.toLowerCase();
  const classes = new Set<AllergyClass>();
  if (/penicillin|amoxicillin/.test(text)) classes.add('penicillin');
  if (/aspirin|ibuprofen|nsaid/.test(text)) classes.add('nsaid');
  if (/sulfa|sulphon|sulfon/.test(text)) classes.add('sulfa');
  if (/clarithro|erythro|macrolide/.test(text)) classes.add('macrolide');
  return classes;
}

/** The regimen for a visit, with any allergy-conflicting drug swapped for the condition's documented alternative. */
function medsFor(spec: ConditionSpec, completedIndex: number, allergies: Set<AllergyClass>): Medication[] {
  if (spec.regimen.length === 0) return [];
  const base = spec.regimen[Math.min(completedIndex, spec.regimen.length - 1)];
  const conflict = base.find((med) => med.allergyClass && allergies.has(med.allergyClass));
  if (!conflict || !conflict.allergyClass) return [...base];
  const alternative = spec.alternatives?.[conflict.allergyClass];
  if (alternative && !alternative.some((med) => med.allergyClass && allergies.has(med.allergyClass))) return [...alternative];
  return base.filter((med) => !(med.allergyClass && allergies.has(med.allergyClass)));
}

function phaseFor(index: number, count: number, journey: ConditionSpec['journey'] | undefined): Phase {
  if (index === 0) return 'initial';
  if (index === count - 1 && count > 2 && journey === 'resolved') return 'closing';
  if (index >= Math.ceil(count / 2)) return 'improving';
  return 'followUp';
}

/** A believable moment for an action taken by a person (booking, messaging): 09:00-22:59 Cairo on that day. */
function humanTimeOn(day: CairoDay, r: Rng): Date {
  return cairoInstant(day, hhmmOf(r.int(9 * 60, 22 * 60 + 50)));
}

function before(date: Date, limit: Date, fallbackMinutes = 30): Date {
  return date.getTime() < limit.getTime() ? date : new Date(limit.getTime() - fallbackMinutes * MS_PER_MINUTE);
}

const minDate = (a: Date, b: Date): Date => (a.getTime() < b.getTime() ? a : b);
const maxDate = (a: Date, b: Date): Date => (a.getTime() > b.getTime() ? a : b);

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------
export function buildPlan(input: PlannerInput): DemoPlan {
  return new Planner(input).build();
}

class Planner {
  private readonly anchor: Date;
  private readonly anchorDay: CairoDay;
  private readonly rows: TimelineRows = emptyRows();
  private readonly patches: Patch[] = [];
  private readonly documents: DocumentFile[] = [];
  private readonly warnings: string[] = [];
  private readonly doctorCalendars = new Map<string, DoctorCalendar>();
  private readonly patientCalendars = new Map<string, PatientCalendar>();
  private readonly appts: Appt[] = [];
  private readonly episodes = new Map<string, EpisodeState>();
  /** Day (offset from the anchor) a doctor's practice starts -- after their verification approval. */
  private readonly practiceStart = new Map<string, number>();
  private readonly notificationKeys = new Set<string>();

  constructor(private readonly input: PlannerInput) {
    this.anchor = input.anchor;
    this.anchorDay = cairoDayOf(input.anchor);
    for (const doctor of input.population.doctors.values()) {
      this.doctorCalendars.set(doctor.key, new DoctorCalendar(doctor));
      this.practiceStart.set(doctor.key, doctor.key === 'doctor11' ? -250 : -290);
    }
    for (const patient of input.population.patients.values()) {
      this.patientCalendars.set(patient.key, new PatientCalendar());
    }
  }

  build(): DemoPlan {
    this.planIdentityTimeline();
    this.planTimeOff();
    this.planStories();
    this.planTopUps();
    this.planMinimumUpcoming();
    this.materializeAppointments();
    this.planDocumentsMinimum();
    this.planReviewModeration();
    this.planAdminRefunds();
    this.planMessages();
    this.planKnowledge();
    this.planDisputes();
    this.planWaitlist();
    this.planProfiles();
    this.planIdentityRepairs();
    this.sortRows();
    return {
      anchor: this.anchor,
      rows: this.rows,
      patches: this.patches,
      documents: this.documents,
      identityRepairs: this.identityRepairs,
      stats: this.stats(),
    };
  }

  // -------------------------------------------------------------------------
  // Identity timeline: signup, verification, re-timed seed notifications
  // -------------------------------------------------------------------------
  private readonly accountCreatedAt = new Map<string, Date>();

  private dayAt(offset: number, hhmm: string): Date {
    return cairoInstant(addDays(this.anchorDay, offset), hhmm);
  }

  private planIdentityTimeline(): void {
    const { population } = this.input;
    const r = rng('identity');
    const notificationsByAccount = new Map<string, SeedNotification[]>();
    for (const notification of this.input.seedNotifications) {
      const list = notificationsByAccount.get(notification.accountId) ?? [];
      list.push(notification);
      notificationsByAccount.set(notification.accountId, list);
    }
    const retime = (accountId: string, title: string, at: Date, extra: Record<string, unknown> = {}): void => {
      const match = (notificationsByAccount.get(accountId) ?? []).find((n) => n.title === title);
      if (!match) return;
      this.patches.push({ model: 'notification', id: match.id, data: { createdAt: at, read: true, ...extra }, reason: `re-time seed notification "${title}"` });
    };

    // Admins joined first.
    this.patches.push({ model: 'account', id: population.adminAccountId, data: { createdAt: this.dayAt(-400, '09:30') }, reason: 'admin signup date' });
    retime(population.adminAccountId, 'Welcome to Orivex', this.dayAt(-400, '09:30'));
    if (population.hospitalAdminAccountId) {
      this.patches.push({ model: 'account', id: population.hospitalAdminAccountId, data: { createdAt: this.dayAt(-390, '10:00') }, reason: 'hospital admin signup date' });
      retime(population.hospitalAdminAccountId, 'Welcome to Orivex', this.dayAt(-390, '10:00'));
    }

    const adminNotifications = notificationsByAccount.get(population.adminAccountId) ?? [];
    const retimeAdminForCase = (caseId: string, at: Date): void => {
      const match = adminNotifications.find((n) => n.actionUrl === `/admin/verification-queue/${caseId}`);
      if (match) this.patches.push({ model: 'notification', id: match.id, data: { createdAt: at, read: true }, reason: 'admin verification-submitted notification' });
    };

    for (const doctor of population.doctors.values()) {
      const signupOffset = doctor.key === 'doctor11' ? -338 : -330 + r.int(0, 25);
      const createdAt = this.dayAt(signupOffset, hhmmOf(r.int(10 * 60, 21 * 60)));
      this.accountCreatedAt.set(doctor.accountId, createdAt);
      this.patches.push({ model: 'account', id: doctor.accountId, data: { createdAt }, reason: 'doctor signup date' });
      this.patches.push({ model: 'doctorProfile', id: doctor.profileId, data: { createdAt: plusMinutes(createdAt, 25) }, reason: 'doctor profile created after signup' });
      retime(doctor.accountId, 'Welcome to Orivex', createdAt);

      const cases = doctor.verificationCaseIds;
      if (doctor.key === 'doctor11' && cases.length >= 2) {
        const firstSubmitted = plusMinutes(createdAt, 24 * 60 + 40);
        const rejectedAt = plusMinutes(firstSubmitted, 46 * 60 + 15);
        const resubmitted = this.dayAt(-256, '11:20');
        const approvedAt = plusMinutes(resubmitted, 26 * 60 + 5);
        this.patches.push({ model: 'verificationCase', id: cases[0].id, data: { submittedAt: firstSubmitted, decidedAt: rejectedAt }, reason: 'realistic review time' });
        this.patches.push({ model: 'verificationCase', id: cases[1].id, data: { submittedAt: resubmitted, decidedAt: approvedAt }, reason: 'realistic review time' });
        retimeAdminForCase(cases[0].id, firstSubmitted);
        retimeAdminForCase(cases[1].id, resubmitted);
        // The resubmission page this linked to is closed to him now that he is verified.
        retime(doctor.accountId, 'Verification rejected', rejectedAt, { actionUrl: null });
        retime(doctor.accountId, 'Verification approved', approvedAt, { actionUrl: '/doctor' });
        retime(doctor.accountId, 'Welcome, Doctor', plusMinutes(approvedAt, 1));
        this.practiceStart.set(doctor.key, daysBetween(this.anchorDay, cairoDayOf(approvedAt)) + 2);
        continue;
      }
      for (const verification of cases) {
        const submittedAt = plusMinutes(createdAt, 24 * 60 + r.int(0, 600));
        const decidedAt = plusMinutes(submittedAt, r.int(18 * 60, 60 * 60));
        this.patches.push({ model: 'verificationCase', id: verification.id, data: { submittedAt, decidedAt: verification.status === 'SUBMITTED' ? null : decidedAt }, reason: 'realistic review time' });
        retimeAdminForCase(verification.id, submittedAt);
        // D3 data fix: an APPROVED doctor's decision notification pointed at
        // /doctor/onboarding, which a verified doctor can't open. The code
        // fix (handler) is reported separately; this repairs the seeded rows.
        retime(doctor.accountId, 'Verification approved', decidedAt, { actionUrl: '/doctor' });
        retime(doctor.accountId, 'Welcome, Doctor', plusMinutes(decidedAt, 1));
      }
    }

    // Patients: signup spread over the window, always before their first booking (see planStories).
    for (const patient of population.patients.values()) {
      const story = PATIENT_STORIES.find((s) => s.patient === patient.key);
      const earliest = Math.max(...(story?.episodes.map((e) => e.startDaysAgo) ?? [200]));
      const signupOffset = -(earliest + 8 + r.int(0, 20));
      const createdAt = this.dayAt(signupOffset, hhmmOf(r.int(9 * 60, 23 * 60)));
      this.accountCreatedAt.set(patient.accountId, createdAt);
      this.patches.push({ model: 'account', id: patient.accountId, data: { createdAt }, reason: 'patient signup date' });
      this.patches.push({ model: 'patientProfile', id: patient.profileId, data: { createdAt: plusMinutes(createdAt, 12) }, reason: 'patient profile created at signup' });
      retime(patient.accountId, 'Welcome to Orivex', createdAt);

      for (const verification of patient.verificationCases) {
        const pending = verification.status === 'SUBMITTED';
        const submittedAt = pending
          ? this.dayAt(patient.key === 'patient12' ? -2 : -5, patient.key === 'patient12' ? '20:15' : '13:40')
          : plusMinutes(createdAt, r.int(2 * 24 * 60, 9 * 24 * 60));
        const decidedAt = pending ? null : plusMinutes(submittedAt, r.int(3 * 60, 30 * 60));
        this.patches.push({ model: 'verificationCase', id: verification.id, data: { submittedAt, decidedAt }, reason: 'realistic review time' });
        retimeAdminForCase(verification.id, submittedAt);
        if (decidedAt) retime(patient.accountId, 'Verification approved', decidedAt);
        if (verification.status === 'SUSPENDED') {
          retime(patient.accountId, 'Verification suspended', this.dayAt(-21, '10:05'));
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Time off
  // -------------------------------------------------------------------------
  private planTimeOff(): void {
    const reservedDays = new Set<number>([0, 1]);
    for (const doctor of this.input.population.doctors.values()) {
      const calendar = this.doctorCalendars.get(doctor.key)!;
      const r = rng(`timeoff:${doctor.key}`);
      const isRef = doctor.key === 'doctor03';
      const pickWorkingDay = (from: number, to: number): CairoDay | undefined => {
        for (let attempt = 0; attempt < 30; attempt += 1) {
          const offset = r.int(from, to);
          if (reservedDays.has(offset) || offset === 6 || offset === 7) continue;
          const day = addDays(this.anchorDay, offset);
          if (calendar.slots(day).length > 0 && !calendar.isTimeOff(day)) return day;
        }
        return undefined;
      };
      const past = pickWorkingDay(-160, -40);
      if (past) calendar.addTimeOff({ day: past, type: 'VACATION', reason: r.pick(['Annual leave', 'Family occasion', 'Medical conference']) });
      const future = pickWorkingDay(isRef ? 9 : 4, isRef ? 13 : 26);
      if (future) calendar.addTimeOff({ day: future, type: isRef ? 'VACATION' : r.pick(['VACATION', 'UNAVAILABLE'] as const), reason: isRef ? 'Annual leave' : r.pick(['Conference', 'Personal day', 'Hospital duty']) });
      if (isRef) {
        const second = pickWorkingDay(20, 27);
        if (second) calendar.addTimeOff({ day: second, type: 'UNAVAILABLE', reason: 'Teaching day at the university' });
      }
    }

    // doctor03's queue must exist on the anchor day itself: if the anchor
    // falls on one of his non-working days, he has added extra hours that
    // day (a real ScheduleException type), rather than the demo pretending.
    const doctor03 = this.doctorCalendars.get('doctor03');
    if (doctor03 && doctor03.slots(this.anchorDay).length === 0) {
      doctor03.addTimeOff({ day: this.anchorDay, type: 'EXTRA_HOURS', hours: { start: '10:00', end: '18:00' }, reason: 'Extra clinic hours' });
      this.warnings.push('Anchor day is not a doctor03 working day: added an EXTRA_HOURS exception so the queue has a day to show.');
    }

    for (const calendar of this.doctorCalendars.values()) {
      calendar.getTimeOff().forEach((entry, index) => {
        this.rows.scheduleException.push({
          id: demoId(`exception:${calendar.doctor.key}:${index}`),
          doctorId: calendar.doctor.profileId,
          date: utcMidnightOf(entry.day),
          type: entry.type,
          startTime: entry.hours?.start ?? null,
          endTime: entry.hours?.end ?? null,
          reason: entry.reason,
          createdAt: before(this.dayAt(daysBetween(this.anchorDay, entry.day) - 21, '18:30'), this.anchor),
        });
      });
    }
  }

  // -------------------------------------------------------------------------
  // Stories -> appointments
  // -------------------------------------------------------------------------
  private episodeFor(patient: DemoPatientRecord, doctor: DemoDoctorRecord, conditionKey: string, plannedVisits: number, suffix: string): EpisodeState {
    const key = `${patient.key}:${doctor.key}:${conditionKey}:${suffix}`;
    const existing = this.episodes.get(key);
    if (existing) return existing;
    const state: EpisodeState = {
      key,
      patient,
      doctor,
      conditionKey,
      spec: conditionKey === 'pediatric' ? undefined : CONDITIONS[conditionKey],
      pediatric: conditionKey === 'pediatric',
      plannedVisits,
      linkedNodeIds: [],
      previousMeds: [],
      labsOrdered: [],
      completedCount: 0,
    };
    if (!state.pediatric && !state.spec) throw new Error(`Unknown condition "${conditionKey}" in the demo stories.`);
    if (state.spec && state.spec.specialty !== doctor.specialty) {
      throw new Error(`Condition "${conditionKey}" (${state.spec.specialty}) assigned to ${doctor.key} (${doctor.specialty}).`);
    }
    if (state.pediatric && doctor.specialty !== 'Pediatrics') throw new Error(`Paediatric consultation assigned to ${doctor.key}.`);
    this.episodes.set(key, state);
    return state;
  }

  private policy(kind: SlotPolicy['kind']): SlotPolicy {
    return { kind, anchor: this.anchor } as SlotPolicy;
  }

  private reasonFor(episode: EpisodeState, visitIndex: number, r: Rng): string {
    if (episode.pediatric) return composePediatricSoap(episode.patient.firstName, visitIndex, rng(`peds:${episode.key}:${visitIndex}`)).reason;
    const spec = episode.spec!;
    return r.pick(visitIndex === 0 ? spec.reasons.initial : spec.reasons.followUp);
  }

  private planStories(): void {
    const { population } = this.input;
    for (const story of PATIENT_STORIES) {
      const patient = population.patients.get(story.patient);
      if (!patient) {
        this.warnings.push(`${story.patient} missing -- story skipped.`);
        continue;
      }
      const inactiveAfter = story.inactiveAfterDaysAgo !== undefined ? -story.inactiveAfterDaysAgo : Number.POSITIVE_INFINITY;

      // Pins reserve their slots first so nothing else can take them.
      const pinSlots = new Map<PinnedVisit, { slot: Slot; day: CairoDay; originalSlot?: { slot: Slot; day: CairoDay } }>();
      for (const pin of story.pinned ?? []) {
        const doctor = population.doctors.get(pin.doctor);
        if (!doctor) continue;
        const r = rng(`pin:${story.patient}:${pin.doctor}:${pin.dayOffset}`);
        const calendar = this.doctorCalendars.get(doctor.key)!;
        const patientCalendar = this.patientCalendars.get(patient.key)!;
        const kind: SlotPolicy['kind'] = pin.slot === 'any' ? (pin.dayOffset > 0 ? 'future' : 'any') : pin.slot;
        let originalSlot: { slot: Slot; day: CairoDay } | undefined;
        if (pin.outcome === 'rescheduledThenConfirmed' && pin.originalDayOffset !== undefined) {
          originalSlot = place({ doctor: calendar, patient: patientCalendar, targetDay: addDays(this.anchorDay, pin.originalDayOffset), policy: this.policy('future'), r, forwardOnly: true, maxShiftDays: 2, minDay: addDays(this.anchorDay, 1) });
        }
        const placed = place({
          doctor: calendar,
          patient: patientCalendar,
          targetDay: addDays(this.anchorDay, pin.dayOffset),
          policy: this.policy(kind),
          r,
          maxShiftDays: pin.dayOffset === 0 ? 0 : 3,
          forwardOnly: pin.dayOffset > 0,
          minDay: pin.dayOffset > 0 ? addDays(this.anchorDay, 1) : this.anchorDay,
          prefer: pin.slot === 'earlierToday' ? 'latest' : pin.slot === 'soonAfterAnchor' || pin.slot === 'laterToday' ? 'earliest' : 'random',
        });
        if (!placed) {
          this.warnings.push(`Pinned visit ${story.patient}/${pin.doctor} (${pin.slot}, day ${pin.dayOffset}) could not be placed at this anchor.`);
          continue;
        }
        pinSlots.set(pin, { ...placed, originalSlot });
      }

      story.episodes.forEach((episodeSpec, episodeIndex) => {
        const doctor = population.doctors.get(episodeSpec.doctor);
        if (!doctor) {
          this.warnings.push(`${episodeSpec.doctor} missing -- episode skipped.`);
          return;
        }
        const pins = [...pinSlots.entries()].filter(([pin]) => pin.doctor === episodeSpec.doctor && pin.condition === episodeSpec.condition);
        const pinOffset = pins.length > 0 ? Math.min(...pins.map(([pin]) => pin.dayOffset)) : undefined;
        const episode = this.episodeFor(patient, doctor, episodeSpec.condition, episodeSpec.visits + pins.length, String(episodeIndex));
        const realized = this.realizeEpisode(episode, episodeSpec, inactiveAfter, pinOffset);

        // Pinned visits continue the same episode.
        pins.forEach(([pin, placed], pinIndex) => {
          const visitIndex = realized + pinIndex;
          this.addPinnedAppointment(episode, pin, placed, visitIndex);
          pinSlots.delete(pin);
        });
      });

      // A pin with no matching episode is the first visit of a new one (e.g. a new
      // concern booked with a doctor the patient hasn't seen yet).
      for (const [pin, placed] of pinSlots) {
        const doctor = population.doctors.get(pin.doctor);
        if (!doctor) continue;
        const episode = this.episodeFor(patient, doctor, pin.condition, 1, `pin-${pin.dayOffset}`);
        this.addPinnedAppointment(episode, pin, placed, 0);
      }
    }
  }

  /** Returns the number of visits realised (booked) for the episode. */
  private realizeEpisode(episode: EpisodeState, spec: Episode, inactiveAfter: number, pinOffset: number | undefined): number {
    const r = rng(`episode:${episode.key}`);
    let realized = 0;
    let lastOffset: number | undefined;
    const practiceStart = this.practiceStart.get(episode.doctor.key) ?? -290;
    for (let index = 0; index < spec.visits; index += 1) {
      let offset = -spec.startDaysAgo + index * spec.cadenceDays + (index > 0 ? r.int(-2, 2) : 0);
      if (offset < practiceStart) offset = practiceStart + r.int(1, 5);
      if (offset > 29) break;
      if (offset > inactiveAfter) break;
      if (pinOffset !== undefined && offset >= pinOffset - 10) break;
      if (offset === 0) offset = -1; // the anchor day belongs to the pinned queue
      const isFuture = offset > 0;
      const lead = r.int(3, 14);
      if (isFuture && offset - lead >= 0) break; // not booked yet

      const placed = place({
        doctor: this.doctorCalendars.get(episode.doctor.key)!,
        patient: this.patientCalendars.get(episode.patient.key)!,
        targetDay: addDays(this.anchorDay, offset),
        policy: this.policy(isFuture ? 'future' : 'past'),
        r,
        maxShiftDays: 5,
        forwardOnly: isFuture,
        minDay: isFuture ? addDays(this.anchorDay, 1) : addDays(this.anchorDay, Math.max(practiceStart, -285)),
        maxDay: isFuture ? addDays(this.anchorDay, 29) : this.anchorDay,
      });
      if (!placed) {
        this.warnings.push(`No slot for ${episode.key} visit ${index} near day ${offset}.`);
        continue;
      }
      const bookedAt = before(maxDate(this.accountCreatedAt.get(episode.patient.accountId) ?? new Date(0), humanTimeOn(addDays(placed.day, -lead), r)), placed.slot.start, 120);
      if (bookedAt.getTime() >= this.anchor.getTime()) break;

      const appt = this.newAppt(episode, index, placed, bookedAt, r);
      if (isFuture) {
        this.makeUpcoming(appt, r);
      } else {
        this.makePast(appt, r);
      }
      realized += 1;
      lastOffset = offset;
    }

    // Ongoing care: the next follow-up is already on the books when it falls
    // inside the 30-day booking window and its booking lead has passed.
    const ongoing = episode.spec?.journey === 'ongoing_chronic' || episode.spec?.journey === 'monitoring';
    if (ongoing && realized === spec.visits && lastOffset !== undefined && pinOffset === undefined) {
      const nextOffset = lastOffset + spec.cadenceDays + r.int(-2, 2);
      const lead = r.int(3, 14);
      if (nextOffset > 0 && nextOffset <= 29 && nextOffset <= inactiveAfter && nextOffset - lead < 0) {
        const placed = place({
          doctor: this.doctorCalendars.get(episode.doctor.key)!,
          patient: this.patientCalendars.get(episode.patient.key)!,
          targetDay: addDays(this.anchorDay, nextOffset),
          policy: this.policy('future'),
          r,
          maxShiftDays: 4,
          forwardOnly: true,
          minDay: addDays(this.anchorDay, 1),
          maxDay: addDays(this.anchorDay, 29),
        });
        if (placed) {
          const bookedAt = before(humanTimeOn(addDays(placed.day, -lead), r), this.anchor, 120);
          this.makeUpcoming(this.newAppt(episode, spec.visits, placed, bookedAt, r), r);
          realized += 1;
        }
      }
    }
    return realized;
  }

  private newAppt(episode: EpisodeState, visitIndex: number, placed: { slot: Slot; day: CairoDay }, bookedAt: Date, r: Rng, suffix = '', feeOverride?: number | null): Appt {
    const calendar = this.doctorCalendars.get(episode.doctor.key)!;
    const key = `${episode.key}:${visitIndex}${suffix}`;
    const isFirstWithDoctor = !this.appts.some((other) => other.doctor.key === episode.doctor.key && other.patient.key === episode.patient.key);
    const appt: Appt = {
      key,
      id: demoId(`appointment:${key}`),
      windowId: demoId(`window:${key}`),
      doctor: episode.doctor,
      patient: episode.patient,
      slot: placed.slot,
      day: placed.day,
      status: 'REQUESTED',
      fee: feeOverride !== undefined ? feeOverride : calendar.feeFor(placed.day),
      bookedAt,
      paid: false,
      reason: this.reasonFor(episode, visitIndex, r),
      appointmentType: isFirstWithDoctor ? 'NEW_PATIENT' : visitIndex === 0 ? 'CONSULTATION' : 'FOLLOW_UP',
      episode,
      visitIndex,
      clinical: false,
    };
    this.appts.push(appt);
    return appt;
  }

  /** Confirms (paid: payment at booking; free: doctor approval a few hours later). */
  private confirm(appt: Appt, r: Rng): void {
    appt.status = 'CONFIRMED';
    if (appt.fee !== null) {
      appt.paid = true;
      appt.confirmedAt = plusMinutes(appt.bookedAt, 2);
    } else {
      appt.confirmedAt = minDate(plusMinutes(appt.bookedAt, r.int(40, 6 * 60)), plusMinutes(appt.slot.start, -60));
    }
    appt.sessionId = demoId(`session:${appt.key}`);
  }

  private makeUpcoming(appt: Appt, r: Rng): void {
    const sinceBooking = this.anchor.getTime() - appt.bookedAt.getTime();
    if (appt.fee === null && sinceBooking < 2 * 24 * MS_PER_HOUR) {
      // Free booking the doctor hasn't approved yet: Pending Approval.
      appt.status = 'REQUESTED';
      return;
    }
    this.confirm(appt, r);
  }

  private disruptionFor(appt: Appt, r: Rng): Disruption | undefined {
    const forced = FORCED_DISRUPTIONS.find((d) => d.patient === appt.patient.key && d.doctor === appt.doctor.key && d.visitIndex === appt.visitIndex);
    if (forced) return forced.kind;
    if (REFERENCE_PAIRS.has(appt.doctor.key) || REFERENCE_PAIRS.has(appt.patient.key)) return undefined;
    const roll = r.next();
    if (roll < 0.04) return 'patientCancel';
    if (roll < 0.055) return 'doctorCancel';
    if (roll < 0.08) return 'noShow';
    if (roll < 0.11) return 'reschedule';
    if (appt.fee === null && roll < 0.135) return 'declined';
    if (appt.fee === null && roll < 0.155) return 'expired';
    return undefined;
  }

  private makePast(appt: Appt, r: Rng): void {
    const disruption = this.disruptionFor(appt, r);
    if (!disruption) {
      this.complete(appt, r);
      return;
    }

    switch (disruption) {
      case 'patientCancel':
      case 'doctorCancel': {
        this.confirm(appt, r);
        appt.status = 'CANCELLED';
        appt.cancelledBy = disruption === 'patientCancel' ? 'patient' : 'doctor';
        appt.statusChangedAt = before(maxDate(plusMinutes(appt.confirmedAt!, 60), plusMinutes(appt.slot.start, -r.int(20, 60) * 60)), appt.slot.start, 90);
        if (appt.paid) appt.refundedAt = plusMinutes(appt.statusChangedAt, 1);
        break;
      }
      case 'noShow': {
        this.confirm(appt, r);
        appt.status = 'NO_SHOW';
        appt.statusChangedAt = plusMinutes(appt.slot.start, 31 + r.int(0, 4));
        break;
      }
      case 'expired': {
        appt.status = 'EXPIRED';
        appt.statusChangedAt = plusMinutes(appt.slot.start, r.int(1, 5));
        break;
      }
      case 'declined': {
        appt.status = 'CANCELLED';
        appt.cancelledBy = 'doctor';
        appt.declineReason = r.pick(DECLINE_REASONS);
        appt.statusChangedAt = before(plusMinutes(appt.bookedAt, r.int(60, 20 * 60)), appt.slot.start);
        break;
      }
      case 'reschedule': {
        this.confirm(appt, r);
        appt.status = 'RESCHEDULED';
        appt.statusChangedAt = before(maxDate(plusMinutes(appt.confirmedAt!, 3 * 60), plusMinutes(appt.slot.start, -r.int(1, 3) * 24 * 60)), appt.slot.start, 180);
        if (appt.paid) appt.refundedAt = plusMinutes(appt.statusChangedAt, 1);
        break;
      }
    }

    // The clinical visit happens on a replacement booking a few days later.
    const replacementTarget = addDays(appt.day, r.int(2, 6));
    const isFuture = compareDay(replacementTarget, this.anchorDay) > 0;
    const placed = place({
      doctor: this.doctorCalendars.get(appt.doctor.key)!,
      patient: this.patientCalendars.get(appt.patient.key)!,
      targetDay: replacementTarget,
      policy: this.policy(isFuture ? 'future' : 'past'),
      r,
      forwardOnly: true,
      maxShiftDays: 6,
      minDay: addDays(appt.day, 1),
      maxDay: isFuture ? addDays(this.anchorDay, 29) : this.anchorDay,
    });
    if (!placed) {
      this.warnings.push(`No replacement slot for ${appt.key} (${disruption}).`);
      return;
    }
    const bookedAt = disruption === 'reschedule' ? appt.statusChangedAt! : before(plusMinutes(appt.statusChangedAt ?? appt.bookedAt, r.int(30, 26 * 60)), placed.slot.start, 120);
    if (bookedAt.getTime() >= this.anchor.getTime()) return;
    const replacement = this.newAppt(appt.episode, appt.visitIndex, placed, bookedAt, r, ':rebook');
    replacement.appointmentType = appt.appointmentType;
    replacement.reason = appt.reason;
    if (disruption === 'reschedule') replacement.rescheduledFromId = appt.id;
    if (isFuture) this.makeUpcoming(replacement, r);
    else this.complete(replacement, r);
  }

  private complete(appt: Appt, r: Rng): void {
    this.confirm(appt, r);
    appt.status = 'COMPLETED';
    appt.clinical = true;
    const [minDuration, maxDuration] = FOCUS_SPECIALTY_DURATION[appt.doctor.specialty] ?? [15, 25];
    appt.startedAt = plusMinutes(appt.slot.start, r.int(0, 4));
    appt.closedAt = plusMinutes(appt.startedAt, r.int(minDuration, maxDuration));
    appt.statusChangedAt = appt.closedAt;
  }

  private addPinnedAppointment(episode: EpisodeState, pin: PinnedVisit, placed: { slot: Slot; day: CairoDay; originalSlot?: { slot: Slot; day: CairoDay } }, visitIndex: number): void {
    const r = rng(`pinned:${episode.key}:${pin.dayOffset}`);
    const lead = pin.dayOffset <= 0 ? r.int(4, 9) : r.int(2, 6);
    const bookedAt = before(humanTimeOn(addDays(placed.day, -lead), r), this.anchor, 240);

    if (pin.outcome === 'rescheduledThenConfirmed' && placed.originalSlot) {
      const original = this.newAppt(episode, visitIndex, placed.originalSlot, before(humanTimeOn(addDays(this.anchorDay, -r.int(6, 9)), r), this.anchor, 300), r, ':original');
      this.confirm(original, r);
      original.status = 'RESCHEDULED';
      original.statusChangedAt = before(humanTimeOn(addDays(this.anchorDay, -1), r), this.anchor, 200);
      if (original.paid) original.refundedAt = plusMinutes(original.statusChangedAt, 1);
      const replacement = this.newAppt(episode, visitIndex, placed, original.statusChangedAt, r);
      replacement.rescheduledFromId = original.id;
      replacement.reason = original.reason;
      replacement.appointmentType = original.appointmentType;
      this.confirm(replacement, r);
      return;
    }

    const appt = this.newAppt(episode, visitIndex, placed, bookedAt, r);
    switch (pin.outcome) {
      case 'completed':
        this.complete(appt, r);
        break;
      case 'confirmed':
        this.confirm(appt, r);
        break;
      case 'pendingApproval':
        appt.status = 'REQUESTED';
        appt.bookedAt = before(humanTimeOn(addDays(this.anchorDay, -1), r), this.anchor, 300);
        break;
      case 'awaitingPayment':
        appt.status = 'REQUESTED';
        appt.bookedAt = plusMinutes(this.anchor, -r.int(20, 90));
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Top-ups: every doctor reaches the completed-visit floor, every practising
  // doctor has upcoming work.
  // -------------------------------------------------------------------------
  private completedCount(doctorKey: string): number {
    return this.appts.filter((a) => a.doctor.key === doctorKey && a.status === 'COMPLETED').length;
  }

  private psychiatristCount(patientKey: string): number {
    return new Set(this.appts.filter((a) => a.patient.key === patientKey && a.doctor.specialty === 'Psychiatry').map((a) => a.doctor.key)).size;
  }

  private planTopUps(): void {
    const { population } = this.input;
    for (const doctor of population.doctors.values()) {
      const focus = DOCTOR_FOCUS[doctor.key];
      if (!focus) continue;
      const r = rng(`topup:${doctor.key}`);
      let round = 0;
      while (this.completedCount(doctor.key) < MIN_COMPLETED_PER_DOCTOR && round < 12) {
        round += 1;
        const candidates = [...population.patients.values()]
          // The suspended patient has no new activity; the reference patient's story is hand-written, never topped up.
          .filter((patient) => patient.key !== 'patient17' && patient.key !== 'patient03')
          .filter((patient) => !focus.femaleOnly || patient.gender === 'female')
          .filter((patient) => !focus.conditions.includes('pediatric') || PARENT_PATIENTS.has(patient.key))
          .filter((patient) => !this.episodesFor(patient.key).some((e) => e.doctor.key === doctor.key));
        if (candidates.length === 0) break;
        // Prefer patients with the fewest psychiatrists (for psychiatry) or fewest visits overall.
        candidates.sort((a, b) =>
          doctor.specialty === 'Psychiatry'
            ? this.psychiatristCount(a.key) - this.psychiatristCount(b.key) || a.key.localeCompare(b.key)
            : this.appts.filter((x) => x.patient.key === a.key).length - this.appts.filter((x) => x.patient.key === b.key).length,
        );
        const patient = candidates[r.int(0, Math.min(2, candidates.length - 1))];
        const condition = r.pick(focus.conditions);
        const needed = MIN_COMPLETED_PER_DOCTOR - this.completedCount(doctor.key);
        const visits = Math.max(2, Math.min(doctor.specialty === 'Psychiatry' ? 5 : 3, needed));
        const episode = this.episodeFor(patient, doctor, condition, visits, `topup${round}`);
        const practiceStart = this.practiceStart.get(doctor.key) ?? -290;
        const startDaysAgo = Math.min(-practiceStart - 10, r.int(60, 230));
        this.realizeEpisode(episode, { doctor: doctor.key, condition, startDaysAgo, visits, cadenceDays: r.int(18, 35) }, Number.POSITIVE_INFINITY, undefined);
      }
      if (this.completedCount(doctor.key) < MIN_COMPLETED_PER_DOCTOR) {
        this.warnings.push(`${doctor.key} has only ${this.completedCount(doctor.key)} completed visits after top-up.`);
      }
    }
  }

  private episodesFor(patientKey: string): EpisodeState[] {
    return [...this.episodes.values()].filter((episode) => episode.patient.key === patientKey);
  }

  private planMinimumUpcoming(): void {
    const { population } = this.input;
    for (const doctor of population.doctors.values()) {
      const r = rng(`upcoming:${doctor.key}`);
      const upcoming = (): Appt[] => this.appts.filter((a) => a.doctor.key === doctor.key && a.slot.start > this.anchor && (a.status === 'CONFIRMED' || a.status === 'REQUESTED'));
      const isFree = doctor.workingDays.every((day) => day.pricingType === 'FREE');
      const needsPending = isFree && !upcoming().some((a) => a.status === 'REQUESTED');
      const target = UPCOMING_TARGET[doctor.key] ?? MIN_UPCOMING_PER_DOCTOR;
      const horizon = doctor.key === 'doctor03' ? 14 : 18;
      let attempts = 0;
      while ((upcoming().length < target || (needsPending && !upcoming().some((a) => a.status === 'REQUESTED'))) && attempts < target * 3) {
        attempts += 1;
        // Prefer an existing patient's next follow-up (one not already booked
        // with this doctor), otherwise a new patient.
        const existing = [...this.episodes.values()].filter(
          (e) => e.doctor.key === doctor.key && e.patient.key !== 'patient17' && !upcoming().some((a) => a.patient.key === e.patient.key),
        );
        const episode =
          existing.length > 0 && (attempts % 2 === 1 || doctor.key === 'doctor03')
            ? r.pick(existing)
            : (() => {
                const focus = DOCTOR_FOCUS[doctor.key];
                const patients = [...population.patients.values()].filter(
                  (p) => p.key !== 'patient17' && p.key !== 'patient03' && (!focus.femaleOnly || p.gender === 'female') && (!focus.conditions.includes('pediatric') || PARENT_PATIENTS.has(p.key)),
                );
                return this.episodeFor(r.pick(patients), doctor, r.pick(focus.conditions), 1, `upcoming${attempts}`);
              })();
        const offset = r.int(2, horizon);
        const placed = place({
          doctor: this.doctorCalendars.get(doctor.key)!,
          patient: this.patientCalendars.get(episode.patient.key)!,
          targetDay: addDays(this.anchorDay, offset),
          policy: this.policy('future'),
          r,
          forwardOnly: true,
          minDay: addDays(this.anchorDay, 1),
          maxDay: addDays(this.anchorDay, 29),
        });
        if (!placed) continue;
        const visitIndex = this.appts.filter((a) => a.episode === episode).length;
        const wantPending = isFree && !upcoming().some((a) => a.status === 'REQUESTED');
        const bookedAt = before(humanTimeOn(addDays(this.anchorDay, wantPending ? -1 : -r.int(2, 6)), r), this.anchor, 120);
        const appt = this.newAppt(episode, visitIndex, placed, bookedAt, r, `:up${attempts}`);
        if (wantPending) appt.status = 'REQUESTED';
        else this.confirm(appt, r);
      }
    }

    // Free check-in slots on a paid doctor's calendar: the doctor priced a few
    // individual upcoming slots as free (per-slot pricing, PATCH
    // /scheduling/upcoming-slots/:id/pricing), and patients' requests for
    // them wait in Pending Approval -- the only shape that queue ever shows.
    for (const [doctorKey, count] of Object.entries(FREE_CHECKIN_REQUESTS)) {
      const doctor = population.doctors.get(doctorKey);
      if (!doctor) continue;
      const r = rng(`free-checkin:${doctorKey}`);
      const candidates = [...this.episodes.values()].filter(
        (e) => e.doctor.key === doctorKey && e.patient.key !== 'patient17' && !this.appts.some((a) => a.doctor.key === doctorKey && a.patient.key === e.patient.key && a.slot.start > this.anchor),
      );
      for (const [index, episode] of r.shuffle(candidates).slice(0, count).entries()) {
        const placed = place({
          doctor: this.doctorCalendars.get(doctorKey)!,
          patient: this.patientCalendars.get(episode.patient.key)!,
          targetDay: addDays(this.anchorDay, 3 + index * 3 + r.int(0, 2)),
          policy: this.policy('future'),
          r,
          forwardOnly: true,
          minDay: addDays(this.anchorDay, 1),
          maxDay: addDays(this.anchorDay, 20),
        });
        if (!placed) continue;
        const visitIndex = this.appts.filter((a) => a.episode === episode).length;
        const appt = this.newAppt(episode, visitIndex, placed, plusMinutes(this.anchor, -r.int(90, 30 * 60)), r, ':free-checkin', null);
        appt.status = 'REQUESTED';
        appt.reason = 'Short free check-in on progress';
      }
    }

    // Every active patient has at least one upcoming visit: their next
    // follow-up with a doctor they already see (never the suspended patient).
    for (const patient of population.patients.values()) {
      if (patient.key === 'patient17') continue;
      const hasUpcoming = this.appts.some((a) => a.patient.key === patient.key && a.slot.start > this.anchor && (a.status === 'CONFIRMED' || a.status === 'REQUESTED'));
      if (hasUpcoming) continue;
      const r = rng(`patient-upcoming:${patient.key}`);
      const episodes = this.episodesFor(patient.key).filter((e) => !e.pediatric && e.spec?.journey !== 'resolved');
      const episode = episodes.length > 0 ? r.pick(episodes) : r.pick(this.episodesFor(patient.key));
      if (!episode) continue;
      const placed = place({
        doctor: this.doctorCalendars.get(episode.doctor.key)!,
        patient: this.patientCalendars.get(patient.key)!,
        targetDay: addDays(this.anchorDay, r.int(3, 16)),
        policy: this.policy('future'),
        r,
        forwardOnly: true,
        maxShiftDays: 10,
        minDay: addDays(this.anchorDay, 1),
        maxDay: addDays(this.anchorDay, 29),
      });
      if (!placed) {
        this.warnings.push(`${patient.key}: no slot for an upcoming follow-up.`);
        continue;
      }
      const visitIndex = this.appts.filter((a) => a.episode === episode).length;
      const bookedAt = before(humanTimeOn(addDays(this.anchorDay, -r.int(1, 5)), r), this.anchor, 120);
      const appt = this.newAppt(episode, visitIndex, placed, bookedAt, r, ':patient-up');
      if (appt.fee === null && this.anchor.getTime() - bookedAt.getTime() < 2 * 24 * MS_PER_HOUR) appt.status = 'REQUESTED';
      else this.confirm(appt, r);
    }
  }

  // -------------------------------------------------------------------------
  // Materialisation: rows for windows, appointments, sessions, payments and
  // every clinical record of a completed visit.
  // -------------------------------------------------------------------------
  private notify(key: string, accountId: string, at: Date, title: string, description: string, extra: { actionUrl?: string | null; entityType?: string; entityId?: string } = {}): void {
    // Short notification retention (docs/09-physical-database.md): only the last ~75 days are kept.
    if (at.getTime() > this.anchor.getTime() || at.getTime() < this.anchor.getTime() - 75 * MS_PER_DAY) return;
    const id = demoId(`notification:${key}:${accountId}`);
    if (this.notificationKeys.has(id)) return;
    this.notificationKeys.add(id);
    const ageDays = (this.anchor.getTime() - at.getTime()) / MS_PER_DAY;
    const r = rng(`read:${id}`);
    const read = ageDays > 10 ? r.chance(0.97) : ageDays > 3 ? r.chance(0.7) : r.chance(0.35);
    this.rows.notification.push({
      id,
      accountId,
      title,
      description,
      severity: 'INFO',
      read,
      createdAt: at,
      actionUrl: extra.actionUrl ?? null,
      entityType: extra.entityType ?? null,
      entityId: extra.entityId ?? null,
    });
  }

  private materializeAppointments(): void {
    const ordered = [...this.appts].sort((a, b) => a.slot.start.getTime() - b.slot.start.getTime());
    for (const appt of ordered) {
      this.writeAppointment(appt);
    }
    for (const appt of ordered.filter((a) => a.clinical)) {
      this.writeEncounter(appt);
    }
    this.writeJourneys();
  }

  private writeAppointment(appt: Appt): void {
    const r = rng(`write:${appt.key}`);
    const isRequestedNow = appt.status === 'REQUESTED';
    const released = appt.status === 'EXPIRED' || (appt.status === 'CANCELLED' && !appt.confirmedAt);
    const fee = appt.fee;
    const lastChange = appt.closedAt ?? appt.statusChangedAt ?? appt.confirmedAt ?? appt.bookedAt;

    this.rows.availabilityWindow.push({
      id: appt.windowId,
      doctorId: appt.doctor.profileId,
      startTime: appt.slot.start,
      endTime: appt.slot.end,
      consultationType: fee === null ? 'FREE' : 'PAID',
      feeAmount: fee,
      feeCurrency: fee === null ? null : 'EGP',
      status: released ? 'OPEN' : isRequestedNow ? 'HELD' : 'BOOKED',
      // A free request awaiting the doctor's approval holds its slot until the
      // slot starts (BookAppointmentUseCase); a paid one awaiting payment
      // holds it for the 15-minute booking flow.
      holdExpiresAt: isRequestedNow ? (fee === null ? appt.slot.start : plusMinutes(appt.bookedAt, 15)) : null,
      version: released ? 3 : isRequestedNow ? 2 : 3,
      createdAt: plusMinutes(appt.bookedAt, -r.int(3, 30)),
      updatedAt: released ? appt.statusChangedAt ?? appt.bookedAt : appt.confirmedAt ?? appt.bookedAt,
    });

    this.rows.appointment.push({
      id: appt.id,
      patientId: appt.patient.profileId,
      doctorId: appt.doctor.profileId,
      availabilityWindowId: appt.windowId,
      consultationType: fee === null ? 'FREE' : 'PAID',
      feeAmount: fee,
      feeCurrency: fee === null ? null : 'EGP',
      status: appt.status,
      scheduledAt: appt.slot.start,
      endTime: appt.slot.end,
      appointmentType: appt.appointmentType,
      reasonForVisit: appt.reason,
      rescheduledFromId: appt.rescheduledFromId ?? null,
      version: 1 + (appt.confirmedAt ? 1 : 0) + (appt.status !== 'CONFIRMED' && appt.status !== 'REQUESTED' ? 1 : 0),
      createdAt: appt.bookedAt,
      updatedAt: lastChange,
    });

    // Session: created at confirmation (WAITING_ROOM); a completed visit
    // closes COMPLETED; a no-show (and a confirmed-then-cancelled or
    // rescheduled visit) is closed INTERRUPTED_TECHNICAL by the stale-session
    // sweep, which only picks a session up once its slot started 4 h ago and
    // nothing touched it for 4 h (D13). Only the no-show -- a real, booked
    // visit that did not happen -- tells both sides it was interrupted.
    if (appt.sessionId && appt.confirmedAt) {
      let state: 'WAITING_ROOM' | 'CLOSED' = 'WAITING_ROOM';
      let completionReason: 'COMPLETED' | 'INTERRUPTED_TECHNICAL' | null = null;
      let closedAt: Date | null = null;
      if (appt.status === 'COMPLETED') {
        state = 'CLOSED';
        completionReason = 'COMPLETED';
        closedAt = appt.closedAt!;
      } else if (appt.status === 'NO_SHOW' || appt.status === 'CANCELLED' || appt.status === 'RESCHEDULED') {
        const sweptAt = plusMinutes(maxDate(appt.slot.start, appt.confirmedAt), 4 * 60 + r.int(2, 14));
        if (sweptAt.getTime() <= this.anchor.getTime()) {
          state = 'CLOSED';
          completionReason = 'INTERRUPTED_TECHNICAL';
          closedAt = sweptAt;
        }
      }
      this.rows.consultationSession.push({
        id: appt.sessionId,
        appointmentId: appt.id,
        state,
        completionReason,
        startedAt: appt.startedAt ?? null,
        closedAt,
        version: state === 'CLOSED' ? 3 : 1,
        createdAt: appt.confirmedAt,
        updatedAt: closedAt ?? appt.confirmedAt,
      });
      if (completionReason === 'INTERRUPTED_TECHNICAL' && closedAt && appt.status === 'NO_SHOW') {
        this.notify(`interrupted:${appt.key}`, appt.patient.accountId, closedAt, 'Consultation interrupted', 'Your consultation was interrupted before it could be completed.', {
          actionUrl: '/patient/appointments',
          entityType: 'appointment',
          entityId: appt.id,
        });
        this.notify(`interrupted:${appt.key}`, appt.doctor.accountId, closedAt, 'Consultation interrupted', 'A consultation was interrupted before it could be completed.', {
          actionUrl: `/doctor/appointments?highlight=${appt.id}`,
          entityType: 'appointment',
          entityId: appt.id,
        });
      }
    }

    // Payment: pay-then-confirm, so it is dated at booking -- never at seed time (D5).
    if (appt.paid && fee !== null) {
      const paidAt = plusMinutes(appt.bookedAt, 1);
      this.rows.paymentTransaction.push({
        id: demoId(`payment:${appt.key}`),
        idempotencyKey: `demo-seed:${appt.key}`,
        appointmentId: appt.id,
        consultationSessionId: appt.sessionId ?? null,
        patientId: appt.patient.profileId,
        doctorId: appt.doctor.profileId,
        amount: fee,
        currency: 'EGP',
        paymentMethod: r.chance(0.8) ? 'CARD' : 'MOBILE_WALLET',
        status: appt.refundedAt ? 'REFUNDED' : 'SUCCEEDED',
        externalReference: `pi_demo_seed_${demoId(`pi:${appt.key}`).replace(/-/g, '').slice(0, 20)}`,
        createdAt: paidAt,
        updatedAt: appt.refundedAt ?? paidAt,
      });
      this.notify(`paid:${appt.key}`, appt.patient.accountId, paidAt, 'Payment received', `Your payment of ${fee} EGP was received.`, {
        actionUrl: '/patient/appointments',
        entityType: 'appointment',
        entityId: appt.id,
      });
      if (appt.refundedAt) {
        this.notify(`refund:${appt.key}`, appt.patient.accountId, appt.refundedAt, 'Refund issued', `You were refunded ${fee} EGP.`, {
          actionUrl: '/patient/appointments',
          entityType: 'appointment',
          entityId: appt.id,
        });
      }
    }

    this.appointmentNotifications(appt);
  }

  private appointmentNotifications(appt: Appt): void {
    const patientName = appt.patient.displayName;
    const base = { entityType: 'appointment', entityId: appt.id };
    if (appt.fee === null) {
      this.notify(`requested:${appt.key}`, appt.doctor.accountId, plusMinutes(appt.bookedAt, 1), 'New appointment request', `${patientName} has requested an appointment. Approve it to add them to your queue.`, {
        ...base,
        actionUrl: `/doctor/appointments?highlight=${appt.id}`,
      });
    }
    if (appt.confirmedAt) {
      this.notify(`confirmed:${appt.key}`, appt.patient.accountId, appt.confirmedAt, 'Appointment approved', 'Your doctor has approved your appointment request.', { ...base, actionUrl: '/patient/appointments' });
      // The doctor's "checked in" only fires for same-day confirmations (UTC day, as the handler does).
      if (appt.confirmedAt.toISOString().slice(0, 10) === appt.slot.start.toISOString().slice(0, 10)) {
        this.notify(`checkedin:${appt.key}`, appt.doctor.accountId, appt.confirmedAt, 'Patient checked in', `${patientName} is now waiting in your queue.`, { ...base, actionUrl: '/doctor/queue' });
      }
      // 24-hour reminder (the BullMQ delayed job), when the booking was made more than a day ahead.
      const reminderAt = new Date(appt.slot.start.getTime() - 24 * MS_PER_HOUR);
      if (reminderAt.getTime() > appt.confirmedAt.getTime() && (appt.status === 'COMPLETED' || appt.status === 'CONFIRMED' || appt.status === 'NO_SHOW')) {
        this.notify(`reminder:${appt.key}`, appt.patient.accountId, reminderAt, 'Upcoming appointment reminder', `You have an upcoming appointment scheduled for ${appt.slot.start.toISOString()}.`);
      }
    }
    if (appt.status === 'CANCELLED' && appt.statusChangedAt) {
      if (appt.declineReason) {
        this.notify(`declined:${appt.key}`, appt.patient.accountId, appt.statusChangedAt, 'Appointment request declined', `Your doctor declined your appointment request: ${appt.declineReason}`, { ...base, actionUrl: '/patient/appointments' });
      } else {
        this.notify(
          `cancelled:${appt.key}`,
          appt.patient.accountId,
          appt.statusChangedAt,
          'Appointment cancelled',
          appt.cancelledBy === 'doctor'
            ? 'Your doctor cancelled your appointment. Any payment made will be refunded automatically.'
            : 'Your appointment has been cancelled. Any payment made will be refunded automatically.',
          { ...base, actionUrl: '/patient/appointments' },
        );
        if (appt.cancelledBy === 'patient') {
          this.notify(`cancelled:${appt.key}`, appt.doctor.accountId, appt.statusChangedAt, 'Appointment cancelled', 'A patient cancelled their appointment with you.', { ...base, actionUrl: '/doctor/queue' });
        }
      }
    }
    if (appt.status === 'EXPIRED' && appt.statusChangedAt) {
      this.notify(`expired:${appt.key}`, appt.patient.accountId, appt.statusChangedAt, 'Appointment request expired', 'Your appointment request expired unanswered. You can book a new appointment with this doctor.', { ...base, actionUrl: '/patient/appointments' });
    }
    if (appt.rescheduledFromId) {
      this.notify(`rescheduled:${appt.key}`, appt.patient.accountId, appt.bookedAt, 'Appointment rescheduled', 'Your appointment was rescheduled to a new time.', { ...base, actionUrl: '/patient/appointments' });
      this.notify(`rescheduled:${appt.key}`, appt.doctor.accountId, appt.bookedAt, 'Appointment rescheduled', 'A patient rescheduled their appointment with you to a new time.', { ...base, actionUrl: '/doctor/queue' });
    }
  }

  private writeEncounter(appt: Appt): void {
    const episode = appt.episode;
    const r = rng(`encounter:${appt.key}`);
    const sessionId = appt.sessionId!;
    const startedAt = appt.startedAt!;
    const closedAt = appt.closedAt!;
    const completedIndex = episode.completedCount;
    episode.completedCount += 1;
    const doctorId = appt.doctor.profileId;
    const enrichment = PATIENT_ENRICHMENT[appt.patient.key];

    // -- Paediatric parent guidance: notes only.
    if (episode.pediatric) {
      const soap = composePediatricSoap(appt.patient.firstName, completedIndex, rng(`peds:${episode.key}:${appt.visitIndex}`));
      this.rows.clinicalNote.push({
        id: demoId(`note:${appt.key}`),
        consultationSessionId: sessionId,
        authoringDoctorId: doctorId,
        content: soap.content,
        subjective: soap.subjective,
        objective: soap.objective,
        assessment: soap.assessment,
        plan: soap.plan,
        createdAt: plusMinutes(closedAt, -2),
      });
      this.afterEncounter(appt, false, undefined);
      return;
    }

    const spec = episode.spec!;
    const phase = phaseFor(completedIndex, episode.plannedVisits, spec.journey);
    const allergies = allergyClassesOf(appt.patient, enrichment?.allergies);
    const meds = medsFor(spec, completedIndex, allergies);
    const labTests = completedIndex === 0 ? (spec.labs ?? []).map((lab) => lab.test) : [];

    // -- Vitals from the patient's own trajectory.
    const daysBefore = (this.anchor.getTime() - startedAt.getTime()) / MS_PER_DAY;
    const profile = vitalsProfileFor(appt.patient.key, appt.patient.gender);
    const kinds: readonly VitalKind[] = spec.vitals;
    const vitals = vitalsAt(profile, daysBefore, kinds, rng(`vitals:${appt.key}`));
    const recordedAt = plusMinutes(startedAt, 4);
    const pushVital = (kind: string, type: 'WEIGHT' | 'BLOOD_PRESSURE' | 'BLOOD_SUGAR', value: number, diastolicValue: number | null): void => {
      this.rows.vitalReading.push({
        id: demoId(`vital:${appt.key}:${kind}`),
        patientId: appt.patient.profileId,
        type,
        value,
        diastolicValue,
        recordedAt,
        createdAt: recordedAt,
        recordedByDoctorId: doctorId,
        consultationSessionId: sessionId,
        source: 'CLINICAL',
      });
    };
    if (vitals.weight !== undefined) pushVital('weight', 'WEIGHT', vitals.weight, null);
    if (vitals.systolic !== undefined) pushVital('bp', 'BLOOD_PRESSURE', vitals.systolic, vitals.diastolic ?? null);
    if (vitals.sugar !== undefined) pushVital('sugar', 'BLOOD_SUGAR', vitals.sugar, null);

    // -- SOAP note.
    if (meds.length > 0 && !episode.firstTreatmentAt) episode.firstTreatmentAt = startedAt;
    const weeks = episode.firstTreatmentAt ? Math.round((startedAt.getTime() - episode.firstTreatmentAt.getTime()) / (7 * MS_PER_DAY)) : 0;
    const soap = composeSoap(
      spec,
      { firstName: appt.patient.firstName, phase, visitIndex: completedIndex, visitCount: episode.plannedVisits, medications: meds, previousMedications: episode.previousMeds, vitals, weeksOnTreatment: weeks, labTests },
      rng(`soap:${appt.key}`),
    );
    const noteId = demoId(`note:${appt.key}`);
    this.rows.clinicalNote.push({
      id: noteId,
      consultationSessionId: sessionId,
      authoringDoctorId: doctorId,
      content: soap.content,
      subjective: soap.subjective,
      objective: soap.objective,
      assessment: soap.assessment,
      plan: soap.plan,
      createdAt: plusMinutes(closedAt, -2),
    });

    // -- Diagnoses (health graph).
    const graphId = this.graphIdFor(appt.patient, startedAt);
    let diagnosisNodeId = episode.latestNodeId;
    if (completedIndex === 0) {
      diagnosisNodeId = demoId(`node:${episode.key}:root`);
      this.rows.healthGraphNode.push({
        id: diagnosisNodeId,
        healthGraphId: graphId,
        nodeType: 'CONDITION',
        freeTextDescription: spec.label,
        certaintyLevel: spec.confirmsOnSecondVisit ? 'SUSPECTED' : 'CONFIRMED',
        source: 'CLINICAL',
        authoringDoctorId: doctorId,
        consultationSessionId: sessionId,
        createdAt: plusMinutes(startedAt, 10),
      });
      episode.rootNodeId = diagnosisNodeId;
      episode.latestNodeId = diagnosisNodeId;
      episode.journeyCreatedAt = plusMinutes(startedAt, 10);
    } else if (completedIndex === 1 && spec.confirmsOnSecondVisit && episode.rootNodeId) {
      diagnosisNodeId = demoId(`node:${episode.key}:confirmed`);
      this.rows.healthGraphNode.push({
        id: diagnosisNodeId,
        healthGraphId: graphId,
        nodeType: 'CONDITION',
        freeTextDescription: spec.label,
        certaintyLevel: 'CONFIRMED',
        source: 'CLINICAL',
        authoringDoctorId: doctorId,
        consultationSessionId: sessionId,
        supersedesNodeId: episode.rootNodeId,
        createdAt: plusMinutes(startedAt, 10),
      });
      episode.latestNodeId = diagnosisNodeId;
      episode.linkedNodeIds.push(diagnosisNodeId);
    }
    if (completedIndex === 1 && spec.ruledOut && episode.labsOrdered.length > 0) {
      const ruledOutId = demoId(`node:${episode.key}:ruledout`);
      this.rows.healthGraphNode.push({
        id: ruledOutId,
        healthGraphId: graphId,
        nodeType: 'CONDITION',
        freeTextDescription: `${spec.ruledOut.label}: ruled out (${spec.ruledOut.afterLab})`,
        certaintyLevel: 'RULED_OUT',
        source: 'CLINICAL',
        authoringDoctorId: doctorId,
        consultationSessionId: sessionId,
        createdAt: plusMinutes(startedAt, 12),
      });
      episode.linkedNodeIds.push(ruledOutId);
    }

    // -- Prescription, signed through the real HMAC signer with this visit's own signedAt.
    let prescribed = false;
    if (meds.length > 0 && diagnosisNodeId) {
      const prescriptionId = demoId(`prescription:${appt.key}`);
      const signedAt = plusMinutes(closedAt, -3);
      const lineItems = meds.map((med, index) => ({
        id: demoId(`prescription-line:${appt.key}:${index}`),
        drugCatalogId: demoId(`drug:${med.name.toLowerCase()}`),
        drugName: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        durationDays: med.durationDays,
        instructions: med.instructions ?? null,
      }));
      const { signatureHash, verificationCode } = this.input.sign({
        consultationSessionId: sessionId,
        diagnosisNodeId,
        authoringDoctorId: doctorId,
        lineItems: lineItems.map((item) => ({ drugCatalogId: item.drugCatalogId, dosage: item.dosage, frequency: item.frequency, durationDays: item.durationDays })),
        signedAt,
      });
      this.rows.prescription.push({
        id: prescriptionId,
        consultationSessionId: sessionId,
        diagnosisNodeId,
        authoringDoctorId: doctorId,
        status: 'SIGNED',
        signedAt,
        signatureHash,
        verificationCode,
        createdAt: signedAt,
        updatedAt: signedAt,
      });
      for (const item of lineItems) this.rows.prescriptionLineItem.push({ ...item, prescriptionId });
      this.notify(`prescription:${appt.key}`, appt.patient.accountId, signedAt, 'New prescription', 'Your doctor has signed a new prescription for you.', {
        actionUrl: '/patient/prescriptions',
        entityType: 'prescription',
        entityId: prescriptionId,
      });
      prescribed = true;
    }
    episode.previousMeds = meds.length > 0 ? meds : episode.previousMeds;

    // -- Lab requests (initial visit), with the patient's uploaded report a few days later.
    for (const [index, lab] of (completedIndex === 0 ? spec.labs ?? [] : []).entries()) {
      const labId = demoId(`lab:${appt.key}:${index}`);
      const cancelled = !REFERENCE_PAIRS.has(appt.patient.key) && r.chance(0.12);
      this.rows.labRequest.push({
        id: labId,
        consultationSessionId: sessionId,
        authoringDoctorId: doctorId,
        testName: lab.test,
        clinicalReason: lab.reason,
        instructions: lab.instructions ?? (/glucose|HbA1c|lipid/i.test(lab.test) ? 'Fasting for 8-10 hours before the sample.' : null),
        status: cancelled ? 'CANCELLED' : 'ORDERED',
        createdAt: plusMinutes(closedAt, -4),
        updatedAt: cancelled ? plusMinutes(closedAt, 60 * 26) : plusMinutes(closedAt, -4),
      });
      if (cancelled) continue;
      episode.labsOrdered.push(lab.test);
      const uploadAt = plusMinutes(closedAt, r.int(3, 6) * 24 * 60 + r.int(0, 600));
      if (uploadAt.getTime() < this.anchor.getTime() && (appt.patient.key === 'patient03' || r.chance(0.7))) {
        this.addDocument(`lab:${appt.key}:${index}`, appt.patient.accountId, 'lab_report', 'application/pdf', uploadAt, {
          kind: 'lab-report',
          patientName: appt.patient.displayName,
          patientDob: appt.patient.dateOfBirth ? appt.patient.dateOfBirth.toISOString().slice(0, 10) : null,
          doctorName: appt.doctor.displayName,
          test: lab.test,
          collectedOn: plusMinutes(uploadAt, -26 * 60),
          reportedOn: plusMinutes(uploadAt, -4 * 60),
          results: labResults(lab.test, appt.patient.key, r),
        });
      }
    }

    // -- Clinical photos the patient shared for the visit.
    if (completedIndex === 0) {
      const imageStyle =
        spec.specialty === 'Dermatology' ? 'skin' : spec.specialty === 'Dentistry' ? 'dental' : spec.key === 'knee_oa' ? 'xray' : spec.key === 'diabetic_eye_screen' ? 'eye' : undefined;
      if (imageStyle) {
        const at = imageStyle === 'xray' || imageStyle === 'eye' ? plusMinutes(closedAt, 5 * 24 * 60) : plusMinutes(appt.slot.start, -r.int(60, 600));
        if (at.getTime() < this.anchor.getTime()) {
          this.addDocument(`image:${appt.key}`, appt.patient.accountId, 'clinical_attachment', 'image/png', at, {
            kind: 'image',
            title: imageStyle === 'xray' ? 'Knee X-ray (illustration)' : imageStyle === 'eye' ? 'Fundus photograph (illustration)' : imageStyle === 'dental' ? 'Intra-oral photo (illustration)' : 'Skin photo (illustration)',
            subtitle: `${appt.patient.displayName} - ${at.toISOString().slice(0, 10)}`,
            style: imageStyle,
          });
        }
      }
    }

    this.afterEncounter(appt, prescribed, spec);
  }

  /** Feedback, follow-up recommendation, completion notification, addenda -- shared by every completed visit. */
  private afterEncounter(appt: Appt, prescribed: boolean, spec: ConditionSpec | undefined): void {
    const r = rng(`after:${appt.key}`);
    const closedAt = appt.closedAt!;
    const sessionId = appt.sessionId!;
    const episode = appt.episode;
    episode.lastCompletedAt = closedAt;

    // Follow-up recommendation pointing at the episode's next booked visit.
    const next = this.appts
      .filter((other) => other.episode === episode && other.slot.start > appt.slot.start && (other.status === 'COMPLETED' || other.status === 'CONFIRMED' || other.status === 'REQUESTED'))
      .sort((a, b) => a.slot.start.getTime() - b.slot.start.getTime())[0];
    let followUp = false;
    if (next && spec?.followUp && r.chance(0.45)) {
      this.rows.followUpRecommendation.push({
        id: demoId(`follow-up:${appt.key}`),
        consultationSessionId: sessionId,
        authoringDoctorId: appt.doctor.profileId,
        recommendedDate: utcMidnightOf(next.day),
        reason: r.pick(spec.followUp),
        createdAt: plusMinutes(closedAt, -1),
      });
      followUp = true;
    }

    const extras: string[] = [];
    if (prescribed) extras.push('a new prescription is available');
    if (followUp) extras.push('your doctor has recommended a follow-up');
    this.notify(
      `completed:${appt.key}`,
      appt.patient.accountId,
      closedAt,
      'Consultation completed',
      extras.length > 0
        ? `Your consultation is complete -- ${extras.join(', and ')}. Rate your consultation from your appointments history.`
        : 'Your consultation is complete. Rate your consultation from your appointments history.',
      { actionUrl: `/patient/appointments?consultationSessionId=${sessionId}`, entityType: 'consultation', entityId: sessionId },
    );

    // Review.
    const reviewChance = appt.doctor.key === 'doctor03' || appt.patient.key === 'patient03' ? 0.85 : 0.72;
    if (r.chance(reviewChance)) {
      const mean = DOCTOR_RATING_MEAN[appt.doctor.key] ?? 4.5;
      const rating = sampleRating(mean, r);
      const tier = rating >= 5 ? 'great' : rating === 4 ? 'good' : rating === 3 ? 'mixed' : 'poor';
      const comment = r.chance(0.62) ? r.pick(REVIEW_COMMENTS[tier]) : null;
      const dimension = (): number => Math.max(1, Math.min(5, rating + r.pick([-1, 0, 0, 0, 0, 1])));
      const createdAt = before(plusMinutes(closedAt, r.int(40, 20 * 60)), this.anchor, 10);
      this.rows.consultationFeedback.push({
        id: demoId(`feedback:${appt.key}`),
        consultationSessionId: sessionId,
        patientId: appt.patient.profileId,
        doctorId: appt.doctor.profileId,
        rating,
        communicationRating: dimension(),
        punctualityRating: dimension(),
        thoroughnessRating: dimension(),
        comment,
        createdAt,
        moderationStatus: 'VISIBLE',
      });
      this.notify(
        `review:${appt.key}`,
        appt.doctor.accountId,
        createdAt,
        'New consultation review',
        comment ? `${appt.patient.displayName} rated their consultation ${rating}/5: "${comment}"` : `${appt.patient.displayName} rated their consultation ${rating}/5.`,
        { actionUrl: `/doctor/patients/${appt.patient.profileId}` },
      );
    }

    // Occasional addendum after a lab result came back.
    if (spec && episode.labsOrdered.length > 0 && episode.completedCount === 1 && r.chance(0.35)) {
      const addendumAt = plusMinutes(closedAt, r.int(4, 8) * 24 * 60);
      if (addendumAt.getTime() < this.anchor.getTime()) {
        const text = `Addendum: ${episode.labsOrdered[0]} result reviewed from the uploaded report. No change to the plan.`;
        this.rows.clinicalNote.push({
          id: demoId(`note-addendum:${appt.key}`),
          consultationSessionId: sessionId,
          authoringDoctorId: appt.doctor.profileId,
          content: text,
          addendumOfNoteId: demoId(`note:${appt.key}`),
          createdAt: addendumAt,
        });
      }
    }
  }

  private readonly graphIds = new Map<string, string>();

  private graphIdFor(patient: DemoPatientRecord, firstUse: Date): string {
    const cached = this.graphIds.get(patient.key);
    if (cached) return cached;
    if (patient.healthGraphId) {
      this.graphIds.set(patient.key, patient.healthGraphId);
      return patient.healthGraphId;
    }
    const id = demoId(`health-graph:${patient.key}`);
    this.rows.healthGraph.push({ id, patientId: patient.profileId, createdAt: plusMinutes(firstUse, 10) });
    this.graphIds.set(patient.key, id);
    return id;
  }

  private writeJourneys(): void {
    for (const episode of this.episodes.values()) {
      if (!episode.spec || !episode.rootNodeId || !episode.journeyCreatedAt) continue;
      const graphId = this.graphIds.get(episode.patient.key);
      if (!graphId) continue;
      const hasUpcoming = this.appts.some((a) => a.episode === episode && a.slot.start > this.anchor && (a.status === 'CONFIRMED' || a.status === 'REQUESTED'));
      const finishedAll = episode.completedCount >= episode.plannedVisits;
      const stage =
        episode.spec.journey === 'ongoing_chronic'
          ? 'ONGOING_CHRONIC'
          : episode.spec.journey === 'monitoring'
            ? 'MONITORING'
            : episode.spec.journey === 'resolved' && finishedAll && !hasUpcoming
              ? 'RESOLVED'
              : 'FOLLOW_UP';
      const journeyId = demoId(`journey:${episode.key}`);
      this.rows.healthJourney.push({
        id: journeyId,
        healthGraphId: graphId,
        rootNodeId: episode.rootNodeId,
        stage: episode.completedCount === 1 && hasUpcoming && stage !== 'ONGOING_CHRONIC' ? 'FOLLOW_UP' : stage,
        createdAt: episode.journeyCreatedAt,
        updatedAt: episode.lastCompletedAt ?? episode.journeyCreatedAt,
      });
      for (const nodeId of episode.linkedNodeIds) {
        this.rows.journeyNodeLink.push({ id: demoId(`journey-link:${journeyId}:${nodeId}`), journeyId, nodeId });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Documents
  // -------------------------------------------------------------------------
  private addDocument(key: string, ownerAccountId: string, purpose: 'lab_report' | 'clinical_attachment', contentType: 'application/pdf' | 'image/png', at: Date, render: DocumentRender): void {
    const id = demoId(`asset:${key}`);
    const storageKey = `${purpose}/${id}`;
    this.rows.mediaAsset.push({ id, purpose, contentType, sizeEstimate: 0, storageKey, status: 'confirmed', ownerAccountId, createdAt: at, updatedAt: plusMinutes(at, 1) });
    this.documents.push({ assetId: id, storageKey, contentType, render });
  }

  /** Every patient ends with at least two documents: top up with doctor-written letters. */
  private planDocumentsMinimum(): void {
    for (const patient of this.input.population.patients.values()) {
      const owned = (): number => this.rows.mediaAsset.filter((asset) => asset.ownerAccountId === patient.accountId).length;
      const completed = this.appts.filter((a) => a.patient.key === patient.key && a.status === 'COMPLETED').sort((a, b) => b.slot.start.getTime() - a.slot.start.getTime());
      let index = 0;
      while (owned() < 2 && index < completed.length) {
        const appt = completed[index];
        index += 1;
        if (appt.episode.pediatric) continue;
        const spec = appt.episode.spec!;
        const at = plusMinutes(appt.closedAt!, 35);
        if (index === 1 && spec.specialty === 'Internal Medicine') {
          this.addDocument(`letter:${appt.key}`, patient.accountId, 'clinical_attachment', 'application/pdf', at, {
            kind: 'referral-letter',
            patientName: patient.displayName,
            doctorName: appt.doctor.displayName,
            specialty: appt.doctor.specialty,
            to: 'Ophthalmology / partner imaging centre',
            date: at,
            body: `Thank you for seeing ${patient.firstName} for routine screening. Current diagnosis: ${spec.label}. Current treatment as per the attached prescription.`,
          });
        } else {
          this.addDocument(`summary:${appt.key}`, patient.accountId, 'clinical_attachment', 'application/pdf', at, {
            kind: 'visit-summary',
            patientName: patient.displayName,
            doctorName: appt.doctor.displayName,
            specialty: appt.doctor.specialty,
            date: appt.slot.start,
            diagnosis: spec.label,
            plan: this.rows.clinicalNote.find((note) => note.id === demoId(`note:${appt.key}`))?.plan ?? 'See consultation notes.',
          });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Review moderation and admin refunds
  // -------------------------------------------------------------------------
  private planReviewModeration(): void {
    const admin = this.input.population.adminAccountId;
    const reviewsOf = (doctorKey: string): TimelineRows['consultationFeedback'] => {
      const doctor = this.input.population.doctors.get(doctorKey);
      return this.rows.consultationFeedback.filter((review) => review.doctorId === doctor?.profileId).sort((a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime());
    };
    const mutate = (doctorKey: string, fromEnd: number, change: (review: TimelineRows['consultationFeedback'][number]) => void): void => {
      const list = reviewsOf(doctorKey);
      const review = list[list.length - 1 - fromEnd];
      if (review) change(review);
    };
    // Pending admin decision: flagged by the reviewed doctor.
    mutate('doctor03', 2, (review) => {
      review.rating = 1;
      review.communicationRating = 1;
      review.punctualityRating = 2;
      review.thoroughnessRating = 1;
      review.comment = OFFENSIVE_REVIEW_COMMENTS[0];
      review.moderationStatus = 'FLAGGED';
      review.moderationReason = FLAG_REASONS[1];
    });
    mutate('doctor07', 1, (review) => {
      review.rating = 2;
      review.comment = OFFENSIVE_REVIEW_COMMENTS[1];
      review.moderationStatus = 'FLAGGED';
      review.moderationReason = FLAG_REASONS[0];
    });
    // Hidden after admin review.
    mutate('doctor09', 3, (review) => {
      review.rating = 1;
      review.comment = 'Rude and useless. Do not trust this man with anything.';
      review.moderationStatus = 'HIDDEN';
      review.moderationReason = 'Hidden: abusive language with no description of the consultation itself.';
      review.moderatedByAccountId = admin;
      review.moderatedAt = plusMinutes(review.createdAt as Date, 3 * 24 * 60);
    });
    // Flagged by the doctor, restored by the admin.
    mutate('doctor13', 2, (review) => {
      review.rating = 3;
      review.comment = REVIEW_COMMENTS.mixed[1];
      review.moderationStatus = 'VISIBLE';
      review.moderationReason = 'Restored: the comment describes the patient\'s own experience and contains no personal data or abuse.';
      review.moderatedByAccountId = admin;
      review.moderatedAt = plusMinutes(review.createdAt as Date, 2 * 24 * 60);
    });
  }

  private planAdminRefunds(): void {
    // A few completed visits an admin refunded in full (Admin > Payments > Refund):
    // a goodwill refund after a poor connection. Excluded from earnings, as the product does.
    const picks = ['doctor05', 'doctor12', 'doctor17', 'doctor02'];
    for (const doctorKey of picks) {
      const appt = this.appts
        .filter((a) => a.doctor.key === doctorKey && a.status === 'COMPLETED' && a.paid && a.slot.start.getTime() < this.anchor.getTime() - 20 * MS_PER_DAY && a.slot.start.getTime() > this.anchor.getTime() - 70 * MS_PER_DAY)
        .sort((a, b) => a.key.localeCompare(b.key))[0];
      if (!appt) continue;
      const payment = this.rows.paymentTransaction.find((row) => row.appointmentId === appt.id);
      if (!payment) continue;
      const refundedAt = plusMinutes(appt.closedAt!, 2 * 24 * 60 + 130);
      payment.status = 'REFUNDED';
      payment.updatedAt = refundedAt;
      this.notify(`refund:${appt.key}`, appt.patient.accountId, refundedAt, 'Refund issued', `You were refunded ${appt.fee} EGP.`, { actionUrl: '/patient/appointments', entityType: 'appointment', entityId: appt.id });
    }
  }

  // -------------------------------------------------------------------------
  // Messages
  // -------------------------------------------------------------------------
  private planMessages(): void {
    const pairs = new Map<string, Appt[]>();
    for (const appt of this.appts) {
      const key = `${appt.patient.key}|${appt.doctor.key}`;
      const list = pairs.get(key) ?? [];
      list.push(appt);
      pairs.set(key, list);
    }
    const threadCount = new Map<string, number>();
    const bump = (key: string): void => {
      threadCount.set(key, (threadCount.get(key) ?? 0) + 1);
    };
    const chosen: string[] = [];
    // Reference pairs first, then richest relationships, until every account has >= 2 threads.
    const ranked = [...pairs.entries()]
      .filter(([, appts]) => appts.some((a) => a.status === 'COMPLETED'))
      .sort(([keyA, a], [keyB, b]) => {
        const refA = keyA.includes('patient03') || keyA.includes('doctor03') ? 1 : 0;
        const refB = keyB.includes('patient03') || keyB.includes('doctor03') ? 1 : 0;
        return refB - refA || b.length - a.length || keyA.localeCompare(keyB);
      });
    for (const [key] of ranked) {
      const [patientKey, doctorKey] = key.split('|');
      const patientThreads = threadCount.get(patientKey) ?? 0;
      const doctorThreads = threadCount.get(doctorKey) ?? 0;
      const doctorCap = doctorKey === 'doctor03' ? 8 : 5;
      const patientCap = patientKey === 'patient03' ? 4 : 4;
      if (patientThreads >= patientCap || doctorThreads >= doctorCap) continue;
      if (patientThreads >= 2 && doctorThreads >= 2 && !key.includes('doctor03')) continue;
      chosen.push(key);
      bump(patientKey);
      bump(doctorKey);
    }

    for (const key of chosen) {
      const appts = pairs.get(key)!.filter((a) => a.status === 'COMPLETED').sort((a, b) => a.slot.start.getTime() - b.slot.start.getTime());
      const last = appts[appts.length - 1];
      const r = rng(`thread:${key}`);
      const patient = last.patient;
      const doctor = last.doctor;
      const spec = last.episode.spec;
      const scriptType = last.episode.pediatric
        ? r.pick(['scheduling', 'followUp'] as const)
        : spec && spec.regimen.length > 0 && last.episode.previousMeds.length > 0
          ? r.pick(['medication', 'medication', 'scheduling', 'labs', 'followUp'] as const)
          : r.pick(['scheduling', 'receipt', 'followUp', 'labs'] as const);
      const script = r.pick(MESSAGE_SCRIPTS[scriptType]);
      const threadId = demoId(`thread:${patient.key}:${doctor.key}`);
      // Conversation starts 1-3 days after the latest visit; the reference
      // thread (doctor03 <-> patient03) ends with an unread reply from the doctor.
      const isReference = patient.key === 'patient03' && doctor.key === 'doctor03';
      let at = isReference ? plusMinutes(this.anchor, -(26 * 60 + 15)) : plusMinutes(last.closedAt!, r.int(18, 70) * 60);
      if (at.getTime() > this.anchor.getTime() - 30 * MS_PER_MINUTE) at = plusMinutes(this.anchor, -r.int(5, 20) * 60);
      const fillText = (text: string): string =>
        text
          .replace('{first}', patient.firstName)
          .replace('{med}', last.episode.previousMeds[0]?.name ?? 'your medication')
          .replace('{test}', last.episode.labsOrdered[0] ?? 'blood test');
      const messages: TimelineRows['message'] = [];
      const lines = isReference
        ? [
            { from: 'patient' as const, text: 'Hello doctor, a quick question before tomorrow\'s appointment: should I take my escitalopram as usual in the morning?' },
            { from: 'doctor' as const, text: 'Hello Youssef, yes, take it as usual. We\'ll review how the 15 mg dose is going tomorrow.' },
            { from: 'patient' as const, text: 'Thank you, see you tomorrow.' },
            { from: 'doctor' as const, text: 'You\'re welcome. If you can, have this week\'s sleep notes ready to go through together.' },
          ]
        : script;
      lines.forEach((line, index) => {
        if (index > 0) at = plusMinutes(at, r.int(isReference ? 30 : 12, isReference ? 300 : 240));
        if (at.getTime() > this.anchor.getTime() - 10 * MS_PER_MINUTE) at = plusMinutes(this.anchor, -(lines.length - index) * 9);
        messages.push({
          id: demoId(`message:${threadId}:${index}`),
          threadId,
          senderAccountId: line.from === 'patient' ? patient.accountId : doctor.accountId,
          body: fillText(line.text),
          readAt: null,
          createdAt: at,
        });
      });
      const lastMessage = messages[messages.length - 1];
      const lastFromDoctor = lastMessage.senderAccountId === doctor.accountId;
      const recent = this.anchor.getTime() - (lastMessage.createdAt as Date).getTime() < 3 * MS_PER_DAY;
      const unreadForRecipient = isReference || (recent && r.chance(0.6));
      // Everything before the last message was read by the other side shortly after it arrived.
      messages.forEach((message, index) => {
        const isLast = index === messages.length - 1;
        if (isLast && unreadForRecipient) return;
        message.readAt = plusMinutes(message.createdAt as Date, r.int(3, 50));
        if ((message.readAt as Date).getTime() > this.anchor.getTime()) message.readAt = plusMinutes(this.anchor, -1);
      });
      const lastAt = lastMessage.createdAt as Date;
      const lastReadByPatient = messages.filter((m) => m.senderAccountId === doctor.accountId && m.readAt).map((m) => m.readAt as Date).sort((a, b) => b.getTime() - a.getTime())[0];
      const lastReadByDoctor = messages.filter((m) => m.senderAccountId === patient.accountId && m.readAt).map((m) => m.readAt as Date).sort((a, b) => b.getTime() - a.getTime())[0];
      this.rows.messageThread.push({
        id: threadId,
        patientId: patient.profileId,
        doctorId: doctor.profileId,
        createdAt: messages[0].createdAt as Date,
        lastMessageAt: lastAt,
        patientLastReadAt: lastFromDoctor && unreadForRecipient ? (lastReadByPatient ?? null) : maxDate(lastAt, lastReadByPatient ?? lastAt),
        doctorLastReadAt: !lastFromDoctor && unreadForRecipient ? (lastReadByDoctor ?? null) : maxDate(lastAt, lastReadByDoctor ?? lastAt),
      });
      this.rows.message.push(...messages);
    }
  }

  // -------------------------------------------------------------------------
  // Knowledge Center
  // -------------------------------------------------------------------------
  private planKnowledge(): void {
    const { population } = this.input;
    const admin = population.adminAccountId;
    for (const article of ARTICLES) {
      const doctor = population.doctors.get(article.doctor);
      if (!doctor) continue;
      const writtenAt = this.dayAt(-article.writtenDaysAgo, '21:10');
      const id = demoId(`article:${article.key}`);
      const decided = article.status === 'PUBLISHED' || article.status === 'REJECTED' || article.status === 'ARCHIVED';
      const moderatedAt = decided ? plusMinutes(writtenAt, 26 * 60 + 40) : null;
      const publishedAt = article.status === 'PUBLISHED' || article.status === 'ARCHIVED' ? moderatedAt : null;
      const archivedAt = article.status === 'ARCHIVED' ? plusMinutes(writtenAt, 40 * 24 * 60) : null;
      this.rows.knowledgeArticle.push({
        id,
        authoringDoctorId: doctor.profileId,
        title: article.title,
        body: article.body,
        status: article.status,
        specialtyId: doctor.specialtyId,
        language: article.language,
        sourcesText: article.sourcesText ?? null,
        viewCount: article.views ?? 0,
        moderationReason:
          article.status === 'REJECTED'
            ? article.moderationReason ?? null
            : article.status === 'PUBLISHED'
              ? 'Approved: clear, accurate and appropriately referenced.'
              : article.status === 'ARCHIVED'
                ? 'Unpublished by the author.'
                : null,
        moderatedByAccountId: article.status === 'ARCHIVED' ? null : decided ? admin : null,
        moderatedAt: article.status === 'ARCHIVED' ? archivedAt : moderatedAt,
        publishedAt,
        createdAt: writtenAt,
        updatedAt: archivedAt ?? moderatedAt ?? writtenAt,
      });
    }

    // Saves and follows: patients save articles that fit their own care and follow doctors they see.
    const saves: [string, string, number][] = [
      ['patient03', 'burnout-signs', 120],
      ['patient03', 'prediabetes-window', 80],
      ['patient03', 'rhinitis-season', 50],
      ['patient02', 'burnout-signs', 140],
      ['patient06', 'prediabetes-window', 100],
      ['patient08', 'home-bp', 150],
      ['patient08', 'salt-ar', 60],
      ['patient11', 'ocd-not-tidy', 160],
      ['patient05', 'postpartum-ar', 120],
      ['patient07', 'exam-anxiety', 90],
      ['patient20', 'acne-myths', 70],
      ['patient09', 'child-fever-ar', 100],
      ['patient16', 'stress-resets', 40],
      ['patient01', 'cbt-practice', 150],
    ];
    for (const [patientKey, articleKey, daysAgo] of saves) {
      const patient = population.patients.get(patientKey);
      const article = ARTICLES.find((a) => a.key === articleKey);
      if (!patient || !article || article.writtenDaysAgo < daysAgo - 1 || article.status !== 'PUBLISHED') continue;
      this.rows.knowledgeArticleSave.push({
        id: demoId(`article-save:${patientKey}:${articleKey}`),
        articleId: demoId(`article:${articleKey}`),
        patientId: patient.profileId,
        createdAt: this.dayAt(-daysAgo, '22:05'),
      });
    }
    const follows: [string, string, number][] = [
      ['patient03', 'doctor03', 200],
      ['patient03', 'doctor16', 90],
      ['patient02', 'doctor03', 180],
      ['patient16', 'doctor03', 150],
      ['patient12', 'doctor03', 60],
      ['patient08', 'doctor12', 200],
      ['patient11', 'doctor07', 170],
      ['patient07', 'doctor02', 150],
      ['patient05', 'doctor06', 160],
      ['patient20', 'doctor14', 120],
      ['patient09', 'doctor15', 130],
      ['patient01', 'doctor01', 210],
    ];
    for (const [patientKey, doctorKey, daysAgo] of follows) {
      const patient = population.patients.get(patientKey);
      const doctor = population.doctors.get(doctorKey);
      if (!patient || !doctor) continue;
      this.rows.doctorFollow.push({
        id: demoId(`follow:${patientKey}:${doctorKey}`),
        patientId: patient.profileId,
        doctorId: doctor.profileId,
        createdAt: this.dayAt(-daysAgo, '20:40'),
      });
    }
  }

  // -------------------------------------------------------------------------
  // Disputes
  // -------------------------------------------------------------------------
  private planDisputes(): void {
    const admin = this.input.population.adminAccountId;
    for (const spec of DISPUTES) {
      const status = spec.appointmentStatus === 'completed' ? 'COMPLETED' : spec.appointmentStatus === 'no_show' ? 'NO_SHOW' : 'CANCELLED';
      const appt = this.appts
        .filter((a) => a.doctor.key === spec.doctor && a.patient.key === spec.patient && a.status === status && a.slot.start < this.anchor)
        .filter((a) => status !== 'CANCELLED' || a.cancelledBy === 'doctor')
        .sort((a, b) => b.slot.start.getTime() - a.slot.start.getTime())[0];
      if (!appt) {
        this.warnings.push(`Dispute "${spec.key}": no ${status} appointment between ${spec.patient} and ${spec.doctor}.`);
        continue;
      }
      const raisedAt = before(plusMinutes(appt.slot.start, spec.raisedAfterDays * 24 * 60 + 300), this.anchor, 120);
      const decidedAt = spec.decidedAfterDays !== undefined ? before(plusMinutes(raisedAt, spec.decidedAfterDays * 24 * 60), this.anchor, 60) : null;
      const raiser = spec.raisedBy === 'patient' ? appt.patient.accountId : appt.doctor.accountId;
      const id = demoId(`dispute:${spec.key}`);
      this.rows.dispute.push({
        id,
        appointmentId: appt.id,
        raisedByAccountId: raiser,
        reason: spec.reason,
        status: spec.status,
        category: spec.category,
        resolutionNotes: spec.status === 'RESOLVED' || spec.status === 'DISMISSED' ? spec.resolutionNotes ?? null : null,
        resolvedByAccountId: spec.status === 'RESOLVED' || spec.status === 'DISMISSED' ? admin : null,
        resolvedAt: spec.status === 'RESOLVED' || spec.status === 'DISMISSED' || spec.status === 'WITHDRAWN' ? decidedAt ?? before(plusMinutes(raisedAt, 22 * 60), this.anchor, 30) : null,
        createdAt: raisedAt,
      });
      const counterparty = spec.raisedBy === 'patient' ? { account: appt.doctor.accountId, url: '/doctor/disputes' } : { account: appt.patient.accountId, url: '/patient/disputes' };
      const raiserUrl = spec.raisedBy === 'patient' ? '/patient/disputes' : '/doctor/disputes';
      const base = { entityType: 'dispute', entityId: id };
      this.notify(`dispute-raised:${spec.key}`, counterparty.account, raisedAt, 'A dispute was raised', 'A dispute was raised about one of your appointments. An admin will review it.', { ...base, actionUrl: counterparty.url });
      if ((spec.status === 'RESOLVED' || spec.status === 'DISMISSED') && decidedAt) {
        const title = spec.status === 'RESOLVED' ? 'Dispute resolved' : 'Dispute dismissed';
        const verb = spec.status === 'RESOLVED' ? 'resolved' : 'dismissed';
        this.notify(`dispute-decided:${spec.key}`, raiser, decidedAt, title, `Your dispute has been ${verb} by an admin. Log in to see the outcome.`, { ...base, actionUrl: raiserUrl });
        this.notify(`dispute-decided:${spec.key}`, counterparty.account, decidedAt, title, `A dispute involving one of your appointments has been ${verb} by an admin. Log in to see the outcome.`, { ...base, actionUrl: counterparty.url });
      }
      if (spec.status === 'WITHDRAWN') {
        this.notify(`dispute-withdrawn:${spec.key}`, counterparty.account, before(plusMinutes(raisedAt, 22 * 60), this.anchor, 30), 'Dispute withdrawn', 'A dispute involving one of your appointments was withdrawn by the party who raised it.', { ...base, actionUrl: counterparty.url });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Waitlist
  // -------------------------------------------------------------------------
  private planWaitlist(): void {
    const { population } = this.input;
    const futureLeave = (doctorKey: string) =>
      this.doctorCalendars
        .get(doctorKey)!
        .getTimeOff()
        .filter((off) => off.type !== 'EXTRA_HOURS' && compareDay(off.day, this.anchorDay) > 0)
        .sort((a, b) => compareDay(a.day, b.day))[0];
    for (const entry of WAITLIST) {
      const patient = population.patients.get(entry.patient);
      if (!patient) continue;
      const createdAt = this.dayAt(-entry.createdDaysAgo, '21:30');
      // The only way to join a waitlist (WaitlistPanel) offers the doctors in
      // the patient's own appointment history, so an entry is for a doctor the
      // patient had already booked by then: the catalog's doctor when that
      // holds, otherwise the doctor they had booked most often (one with a
      // future leave day for a still-WAITING entry, see below).
      const bookingsBefore = (doctorProfileId: string): number =>
        this.rows.appointment.filter((a) => a.patientId === patient.profileId && a.doctorId === doctorProfileId && new Date(a.createdAt ?? 0).getTime() <= createdAt.getTime()).length;
      const usual = [...population.doctors.values()].sort((a, b) => bookingsBefore(b.profileId) - bookingsBefore(a.profileId) || a.key.localeCompare(b.key));
      const doctor = [population.doctors.get(entry.doctor), ...usual].find((d) => d && bookingsBefore(d.profileId) > 0 && (entry.status !== 'WAITING' || futureLeave(d.key)));
      if (!doctor) {
        this.warnings.push(`Waitlist ${entry.patient}: no doctor from the patient's history fits; entry skipped.`);
        continue;
      }
      const notifiedAt = entry.status !== 'WAITING' && entry.status !== 'CANCELLED' ? plusMinutes(createdAt, 2 * 24 * 60 + 75) : null;
      const id = demoId(`waitlist:${entry.patient}:${doctor.key}`);
      // A still-WAITING entry is only coherent while no slot can open in its
      // range: the product's matcher (MatchAvailabilityWithWaitlistUseCase)
      // notifies it on the next availability change otherwise. So a waiting
      // patient is one who can only make a day the doctor is on leave.
      let earliest = utcMidnightOf(addDays(this.anchorDay, entry.rangeDays[0]));
      let latest = utcMidnightOf(addDays(this.anchorDay, entry.rangeDays[1]));
      if (entry.status === 'WAITING') {
        const leave = futureLeave(doctor.key)!;
        earliest = utcMidnightOf(leave.day);
        latest = new Date(utcMidnightOf(leave.day).getTime() + MS_PER_DAY - 60_000);
      }
      this.rows.waitlistEntry.push({
        id,
        patientId: patient.profileId,
        doctorId: doctor.profileId,
        consultationType: null,
        earliestAcceptableAt: earliest,
        latestAcceptableAt: latest,
        status: entry.status,
        notifiedAt,
        fulfilledAt: entry.status === 'FULFILLED' ? plusMinutes(notifiedAt!, 95) : null,
        cancelledAt: entry.status === 'CANCELLED' ? plusMinutes(createdAt, 6 * 24 * 60) : null,
        createdAt,
        updatedAt: entry.status === 'WAITING' ? createdAt : plusMinutes(createdAt, 6 * 24 * 60),
      });
      if (notifiedAt) {
        this.notify(`waitlist:${id}`, patient.accountId, notifiedAt, 'A slot just opened up', 'A doctor you were waiting for now has an opening in your requested date range.', { actionUrl: '/patient/doctors' });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Profiles: addresses, allergies, passport, extra contacts, portfolio
  // -------------------------------------------------------------------------
  private planProfiles(): void {
    const { population } = this.input;
    for (const patient of population.patients.values()) {
      const enrichment = PATIENT_ENRICHMENT[patient.key];
      if (!enrichment) continue;
      const createdAt = this.accountCreatedAt.get(patient.accountId) ?? this.dayAt(-200, '12:00');
      // The identity seed derives birth dates as "N years before the seed ran", so every
      // patient's birthday was the seed day: keep the year, vary the month and day.
      const dob = patient.dateOfBirth;
      const dobRng = rng(`dob:${patient.key}`);
      const dateOfBirth = dob ? new Date(Date.UTC(dob.getUTCFullYear(), dobRng.int(0, 11), dobRng.int(1, 28))) : null;
      this.patches.push({ model: 'account', id: patient.accountId, data: { address: enrichment.address, ...(dateOfBirth ? { dateOfBirth } : {}) }, reason: 'address and birthday' });
      const allergies = patient.allergies ?? enrichment.allergies ?? null;
      const status = allergies ? 'has_allergies' : enrichment.allergiesStatus;
      const confirmingDoctor = enrichment.allergiesConfirmedNoneBy ? population.doctors.get(enrichment.allergiesConfirmedNoneBy) : undefined;
      const confirmedAt = confirmingDoctor
        ? this.appts.filter((a) => a.patient.key === patient.key && a.doctor.key === confirmingDoctor.key && a.status === 'COMPLETED').map((a) => a.closedAt!)[0]
        : undefined;
      this.patches.push({
        model: 'patientProfile',
        id: patient.profileId,
        data: {
          chronicDiseases: enrichment.chronicDiseases ?? null,
          allergies,
          allergiesStatus: status,
          allergiesStatusUpdatedAt: status === 'unknown' ? null : plusMinutes(createdAt, 20),
          allergiesStatusUpdatedByRole: status === 'unknown' ? null : 'patient',
          allergiesConfirmedNoneAt: !allergies && confirmedAt ? confirmedAt : null,
          allergiesConfirmedByDoctorId: !allergies && confirmedAt && confirmingDoctor ? confirmingDoctor.profileId : null,
          bloodType: patient.bloodType ?? enrichment.bloodType ?? null,
          lifestyleNotes: enrichment.passport.lifestyle,
          nutritionNotes: enrichment.passport.nutrition,
          exerciseNotes: enrichment.passport.exercise,
          mentalHealthNotes: enrichment.passport.mentalHealth ?? null,
        },
        reason: 'profile completeness, allergy status and Health Passport notes',
      });
      enrichment.passport.entries.forEach((entry, index) => {
        this.rows.healthPassportEntry.push({
          id: demoId(`passport:${patient.key}:${index}`),
          patientId: patient.profileId,
          category: entry.category,
          title: entry.title,
          detail: entry.detail ?? null,
          occurredAt: entry.occurredYearsAgo !== undefined ? new Date(Date.UTC(this.anchorDay.year - entry.occurredYearsAgo, (index * 3) % 12, 10)) : null,
          createdAt: plusMinutes(createdAt, 60 * 24 * (3 + index)),
        });
      });
      if (enrichment.extraEmergencyContact) {
        this.rows.emergencyContact.push({
          id: demoId(`emergency-contact:${patient.key}:extra`),
          patientProfileId: patient.profileId,
          name: enrichment.extraEmergencyContact.name,
          relationship: enrichment.extraEmergencyContact.relationship,
          phoneNumber: enrichment.extraEmergencyContact.phoneNumber,
          createdAt: plusMinutes(createdAt, 60 * 24 * 12),
        });
      }
    }

    for (const doctor of population.doctors.values()) {
      const enrichment = DOCTOR_ENRICHMENT[doctor.key];
      if (!enrichment) continue;
      const createdAt = this.accountCreatedAt.get(doctor.accountId) ?? this.dayAt(-300, '12:00');
      const has = (title: string): boolean => this.input.existingPortfolio.some((row) => row.doctorProfileId === doctor.profileId && row.title === title);
      enrichment.publications?.forEach((publication, index) => {
        if (has(publication.title)) return;
        this.rows.portfolioPublication.push({
          id: demoId(`publication:${doctor.key}:${index}`),
          doctorProfileId: doctor.profileId,
          title: publication.title,
          reference: publication.reference,
          publishedAt: utcMidnightOf(addDays(this.anchorDay, -publication.monthsAgo * 30)),
          createdAt: plusMinutes(createdAt, 90),
        });
      });
      enrichment.awards?.forEach((award, index) => {
        if (has(award.title)) return;
        this.rows.portfolioAward.push({
          id: demoId(`award:${doctor.key}:${index}`),
          doctorProfileId: doctor.profileId,
          title: award.title,
          issuingBody: award.issuingBody,
          awardedAt: utcMidnightOf(addDays(this.anchorDay, -award.monthsAgo * 30)),
          createdAt: plusMinutes(createdAt, 95),
        });
      });
      enrichment.experience?.forEach((experience, index) => {
        if (has(experience.organizationName)) return;
        this.rows.portfolioWorkExperience.push({
          id: demoId(`experience:${doctor.key}:${index}`),
          doctorProfileId: doctor.profileId,
          organizationName: experience.organizationName,
          position: experience.position,
          professionalRank: experience.rank ?? null,
          startDate: utcMidnightOf(addDays(this.anchorDay, -experience.yearsAgo * 365)),
          endDate: utcMidnightOf(addDays(this.anchorDay, -(experience.yearsAgo - experience.yearsDuration) * 365)),
          description: experience.description,
          createdAt: plusMinutes(createdAt, 100),
        });
      });
      const profileData: Record<string, unknown> = {};
      if (enrichment.maxFreeSlotsPerDay !== undefined) profileData.maxFreeSlotsPerDay = enrichment.maxFreeSlotsPerDay;
      if (Object.keys(profileData).length > 0) {
        this.patches.push({ model: 'doctorProfile', id: doctor.profileId, data: profileData, reason: 'consultation defaults' });
      }
      if (enrichment.extraLanguages) {
        this.patches.push({ model: 'doctorProfile', id: doctor.profileId, data: { __appendLanguages: enrichment.extraLanguages }, reason: 'languages' });
      }
    }

    for (const hospital of this.input.hospitals) {
      const address = HOSPITAL_ADDRESSES[hospital.name];
      // Only the seed's own placeholder is corrected -- never an admin's edit.
      if (address && hospital.address === 'Cairo, Egypt' && address !== hospital.address) {
        this.patches.push({ model: 'hospital', id: hospital.id, data: { address }, reason: 'D14: seeded hospital address' });
      }
    }
  }

  // -------------------------------------------------------------------------
  // D2: identity documents with no stored object
  // -------------------------------------------------------------------------
  private readonly identityRepairs: DocumentFile[] = [];

  private planIdentityRepairs(): void {
    const names = new Map<string, string>();
    for (const doctor of this.input.population.doctors.values()) names.set(doctor.accountId, doctor.displayName);
    for (const patient of this.input.population.patients.values()) names.set(patient.accountId, patient.displayName);
    for (const asset of this.input.identityAssets) {
      const holderName = names.get(asset.ownerAccountId);
      if (!holderName) continue;
      const side = asset.purpose === 'selfie_with_id' ? 'selfie-with-id' : asset.purpose === 'medical_license' ? 'medical-license' : 'national-id-front';
      this.identityRepairs.push({ assetId: asset.id, storageKey: asset.storageKey, contentType: 'image/png', render: { kind: 'identity', side, holderName } });
    }
  }

  // -------------------------------------------------------------------------
  // Ordering and stats
  // -------------------------------------------------------------------------
  private sortRows(): void {
    const byDate = <T extends { createdAt?: Date | string | null }>(rows: T[]): void => {
      rows.sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
    };
    // Originals before the rows that point at them.
    this.rows.appointment.sort((a, b) => (a.rescheduledFromId ? 1 : 0) - (b.rescheduledFromId ? 1 : 0));
    this.rows.healthGraphNode.sort((a, b) => (a.supersedesNodeId ? 1 : 0) - (b.supersedesNodeId ? 1 : 0));
    this.rows.clinicalNote.sort((a, b) => (a.addendumOfNoteId ? 1 : 0) - (b.addendumOfNoteId ? 1 : 0));
    byDate(this.rows.notification);
    byDate(this.rows.message);
  }

  private stats(): DemoPlan['stats'] {
    const count = <K extends string>(keys: K[]): Record<K, number> =>
      keys.reduce((acc, key) => ({ ...acc, [key]: (acc[key] ?? 0) + 1 }), {} as Record<K, number>);
    const future = this.appts.filter((a) => a.slot.start > this.anchor && (a.status === 'CONFIRMED' || a.status === 'REQUESTED'));
    const completed = this.appts.filter((a) => a.status === 'COMPLETED');
    const distinct = (pairs: [string, string][]): Record<string, number> => {
      const map = new Map<string, Set<string>>();
      for (const [a, b] of pairs) map.set(a, (map.get(a) ?? new Set()).add(b));
      return Object.fromEntries([...map.entries()].map(([k, v]) => [k, v.size]));
    };
    return {
      appointmentsByStatus: count(this.appts.map((a) => (a.status === 'CONFIRMED' && a.slot.start < this.anchor ? 'CONFIRMED_PAST' : a.status))),
      completedByDoctor: count(completed.map((a) => a.doctor.key)),
      upcomingByDoctor: count(future.map((a) => a.doctor.key)),
      patientsByDoctor: distinct(this.appts.map((a) => [a.doctor.key, a.patient.key])),
      completedByPatient: count(completed.map((a) => a.patient.key)),
      doctorsByPatient: distinct(this.appts.map((a) => [a.patient.key, a.doctor.key])),
      warnings: this.warnings,
    };
  }
}

// ---------------------------------------------------------------------------
// Ratings and synthetic lab values
// ---------------------------------------------------------------------------
function sampleRating(mean: number, r: Rng): number {
  const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
  const p5 = clamp(mean - 3.85, 0.05, 0.85);
  const p3 = clamp(4.3 - mean, 0.03, 0.45) * 0.6;
  const p2 = mean < 3.8 ? 0.12 : 0.02;
  const roll = r.next();
  if (roll < p5) return 5;
  if (roll < p5 + p3) return 3;
  if (roll < p5 + p3 + p2) return 2;
  return 4;
}

type LabResult = { analyte: string; value: string; unit: string; range: string; flag?: 'H' | 'L' };

function labResults(test: string, patientKey: string, r: Rng): LabResult[] {
  const v = (base: number, spread: number, digits = 1): string => (base + (r.next() * 2 - 1) * spread).toFixed(digits);
  if (/TSH/.test(test) && /free T4/.test(test)) {
    if (patientKey === 'patient18') return [{ analyte: 'TSH', value: '8.9', unit: 'mIU/L', range: '0.4 - 4.0', flag: 'H' }, { analyte: 'Free T4', value: '0.7', unit: 'ng/dL', range: '0.8 - 1.8', flag: 'L' }];
    return [{ analyte: 'TSH', value: v(2.1, 0.8), unit: 'mIU/L', range: '0.4 - 4.0' }, { analyte: 'Free T4', value: v(1.2, 0.2), unit: 'ng/dL', range: '0.8 - 1.8' }];
  }
  if (/TSH/.test(test)) return [{ analyte: 'TSH', value: v(2.0, 0.9), unit: 'mIU/L', range: '0.4 - 4.0' }];
  if (/CBC/.test(test)) {
    if (patientKey === 'patient05') return [{ analyte: 'Haemoglobin', value: '10.1', unit: 'g/dL', range: '12.0 - 15.5', flag: 'L' }, { analyte: 'MCV', value: '74', unit: 'fL', range: '80 - 100', flag: 'L' }, { analyte: 'Platelets', value: '312', unit: 'x10^9/L', range: '150 - 400' }];
    return [{ analyte: 'Haemoglobin', value: v(14.0, 0.8), unit: 'g/dL', range: '12.0 - 17.0' }, { analyte: 'White cells', value: v(6.8, 1.2), unit: 'x10^9/L', range: '4.0 - 11.0' }, { analyte: 'Platelets', value: v(250, 40, 0), unit: 'x10^9/L', range: '150 - 400' }];
  }
  if (/Vitamin D/.test(test)) return [{ analyte: '25-OH vitamin D', value: v(19, 4, 0), unit: 'ng/mL', range: '30 - 100', flag: 'L' }];
  if (/HbA1c/.test(test)) {
    if (patientKey === 'patient06') return [{ analyte: 'HbA1c', value: '7.6', unit: '%', range: '< 5.7', flag: 'H' }];
    if (patientKey === 'patient03') return [{ analyte: 'HbA1c', value: '5.9', unit: '%', range: '< 5.7', flag: 'H' }];
    return [{ analyte: 'HbA1c', value: v(5.3, 0.2), unit: '%', range: '< 5.7' }];
  }
  if (/Lipid/.test(test)) {
    const high = patientKey === 'patient06' || patientKey === 'patient08';
    return [
      { analyte: 'Total cholesterol', value: high ? '238' : v(185, 15, 0), unit: 'mg/dL', range: '< 200', flag: high ? 'H' : undefined },
      { analyte: 'LDL cholesterol', value: high ? '162' : v(112, 12, 0), unit: 'mg/dL', range: '< 130', flag: high ? 'H' : undefined },
      { analyte: 'HDL cholesterol', value: v(47, 5, 0), unit: 'mg/dL', range: '> 40' },
      { analyte: 'Triglycerides', value: v(140, 25, 0), unit: 'mg/dL', range: '< 150' },
    ];
  }
  if (/creatinine/i.test(test)) return [{ analyte: 'Creatinine', value: v(0.9, 0.15, 2), unit: 'mg/dL', range: '0.6 - 1.2' }, { analyte: 'eGFR', value: v(98, 8, 0), unit: 'mL/min/1.73m2', range: '> 90' }];
  if (/ferritin/i.test(test)) return [{ analyte: 'Ferritin', value: patientKey === 'patient05' ? '8' : v(45, 15, 0), unit: 'ng/mL', range: '15 - 150', flag: patientKey === 'patient05' ? 'L' : undefined }];
  if (/IgE/.test(test)) return [{ analyte: 'Total IgE', value: v(260, 40, 0), unit: 'IU/mL', range: '< 100', flag: 'H' }];
  if (/Liver/.test(test)) return [{ analyte: 'ALT', value: v(24, 6, 0), unit: 'U/L', range: '7 - 56' }, { analyte: 'AST', value: v(22, 5, 0), unit: 'U/L', range: '10 - 40' }];
  if (/albumin/i.test(test)) return [{ analyte: 'Urine albumin/creatinine', value: v(18, 5, 0), unit: 'mg/g', range: '< 30' }];
  if (/electrolytes/i.test(test)) return [{ analyte: 'Sodium', value: v(139, 2, 0), unit: 'mmol/L', range: '135 - 145' }, { analyte: 'Potassium', value: v(4.2, 0.3), unit: 'mmol/L', range: '3.5 - 5.1' }];
  return [{ analyte: test, value: 'Within normal limits', unit: '', range: '' }];
}
