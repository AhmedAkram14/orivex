/**
 * Demo timeline -- the plan's shape. Every row is a Prisma "unchecked create"
 * input (so column names and enum values are compile-time checked) with a
 * mandatory deterministic `id`.
 */
import type { Prisma } from '@prisma/client';

type Row<T> = T & { id: string };

/** Insertion order = dependency order; pruning runs in reverse. */
export const TIMELINE_TABLES = [
  'portfolioPublication',
  'portfolioAward',
  'portfolioWorkExperience',
  'emergencyContact',
  'healthPassportEntry',
  'scheduleException',
  'availabilityWindow',
  'appointment',
  'consultationSession',
  'paymentTransaction',
  'healthGraph',
  'healthGraphNode',
  'healthJourney',
  'journeyNodeLink',
  'clinicalNote',
  'prescription',
  'prescriptionLineItem',
  'labRequest',
  'vitalReading',
  'consultationFeedback',
  'followUpRecommendation',
  'mediaAsset',
  'messageThread',
  'message',
  'knowledgeArticle',
  'knowledgeArticleSave',
  'doctorFollow',
  'dispute',
  'waitlistEntry',
  'notification',
] as const;

export type TimelineTable = (typeof TIMELINE_TABLES)[number];

export interface TimelineRows {
  portfolioPublication: Row<Prisma.PortfolioPublicationUncheckedCreateInput>[];
  portfolioAward: Row<Prisma.PortfolioAwardUncheckedCreateInput>[];
  portfolioWorkExperience: Row<Prisma.PortfolioWorkExperienceUncheckedCreateInput>[];
  emergencyContact: Row<Prisma.EmergencyContactUncheckedCreateInput>[];
  healthPassportEntry: Row<Prisma.HealthPassportEntryUncheckedCreateInput>[];
  scheduleException: Row<Prisma.ScheduleExceptionUncheckedCreateInput>[];
  availabilityWindow: Row<Prisma.AvailabilityWindowUncheckedCreateInput>[];
  appointment: Row<Prisma.AppointmentUncheckedCreateInput>[];
  consultationSession: Row<Prisma.ConsultationSessionUncheckedCreateInput>[];
  paymentTransaction: Row<Prisma.PaymentTransactionUncheckedCreateInput>[];
  healthGraph: Row<Prisma.HealthGraphUncheckedCreateInput>[];
  healthGraphNode: Row<Prisma.HealthGraphNodeUncheckedCreateInput>[];
  healthJourney: Row<Prisma.HealthJourneyUncheckedCreateInput>[];
  journeyNodeLink: Row<Prisma.JourneyNodeLinkUncheckedCreateInput>[];
  clinicalNote: Row<Prisma.ClinicalNoteUncheckedCreateInput>[];
  prescription: Row<Prisma.PrescriptionUncheckedCreateInput>[];
  prescriptionLineItem: Row<Prisma.PrescriptionLineItemUncheckedCreateInput>[];
  labRequest: Row<Prisma.LabRequestUncheckedCreateInput>[];
  vitalReading: Row<Prisma.VitalReadingUncheckedCreateInput>[];
  consultationFeedback: Row<Prisma.ConsultationFeedbackUncheckedCreateInput>[];
  followUpRecommendation: Row<Prisma.FollowUpRecommendationUncheckedCreateInput>[];
  mediaAsset: Row<Prisma.MediaAssetUncheckedCreateInput>[];
  messageThread: Row<Prisma.MessageThreadUncheckedCreateInput>[];
  message: Row<Prisma.MessageUncheckedCreateInput>[];
  knowledgeArticle: Row<Prisma.KnowledgeArticleUncheckedCreateInput>[];
  knowledgeArticleSave: Row<Prisma.KnowledgeArticleSaveUncheckedCreateInput>[];
  doctorFollow: Row<Prisma.DoctorFollowUncheckedCreateInput>[];
  dispute: Row<Prisma.DisputeUncheckedCreateInput>[];
  waitlistEntry: Row<Prisma.WaitlistEntryUncheckedCreateInput>[];
  notification: Row<Prisma.NotificationUncheckedCreateInput>[];
}

export function emptyRows(): TimelineRows {
  return Object.fromEntries(TIMELINE_TABLES.map((table) => [table, []])) as unknown as TimelineRows;
}

/**
 * A scoped update to a row the timeline does not own (an identity-seed row:
 * Account/Profile/VerificationCase/seed-time Notification/Hospital) -- only
 * the listed fields, and only for allow-listed demo accounts.
 */
export interface Patch {
  model: 'account' | 'patientProfile' | 'doctorProfile' | 'verificationCase' | 'notification' | 'hospital';
  id: string;
  data: Record<string, unknown>;
  reason: string;
}

/** A synthetic file to render and store at a MediaAsset's storage key. */
export type DocumentRender =
  | { kind: 'lab-report'; patientName: string; patientDob: string | null; doctorName: string; test: string; collectedOn: Date; reportedOn: Date; results: { analyte: string; value: string; unit: string; range: string; flag?: 'H' | 'L' }[] }
  | { kind: 'referral-letter'; patientName: string; doctorName: string; specialty: string; to: string; date: Date; body: string }
  | { kind: 'visit-summary'; patientName: string; doctorName: string; specialty: string; date: Date; diagnosis: string; plan: string }
  | { kind: 'image'; title: string; subtitle: string; style: 'skin' | 'xray' | 'dental' | 'eye' }
  | { kind: 'identity'; side: 'national-id-front' | 'selfie-with-id' | 'medical-license'; holderName: string };

export interface DocumentFile {
  assetId: string;
  storageKey: string;
  contentType: 'application/pdf' | 'image/png';
  render: DocumentRender;
}

export interface PlanStats {
  appointmentsByStatus: Record<string, number>;
  completedByDoctor: Record<string, number>;
  upcomingByDoctor: Record<string, number>;
  patientsByDoctor: Record<string, number>;
  completedByPatient: Record<string, number>;
  doctorsByPatient: Record<string, number>;
  warnings: string[];
}

export interface DemoPlan {
  anchor: Date;
  rows: TimelineRows;
  patches: Patch[];
  documents: DocumentFile[];
  /** Identity-seed MediaAssets (ID cards, licences) whose storage object is missing -- D2. */
  identityRepairs: DocumentFile[];
  stats: PlanStats;
}
