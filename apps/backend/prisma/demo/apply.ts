/**
 * Demo timeline -- the writer.
 *
 * For every table, in dependency order: fetch the planned ids that already
 * exist, create the missing rows, update only rows whose fields differ, then
 * prune timeline-owned rows (UUIDv5, demo scope only) the current plan no
 * longer contains -- which is how a new anchor slides the timeline without
 * duplicates. Rows created by real usage (UUIDv4) are never modified or
 * deleted here.
 *
 * Every row is scope-checked against the demo allow-list before anything is
 * written; a single out-of-scope reference aborts the run.
 */
import { HeadObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import type { PrismaClient } from '@prisma/client';

import { isDemoTimelineId } from './core.js';
import { renderDocument, renderFingerprint } from './files.js';
import type { DemoPopulation } from './load.js';
import type { DemoPlan, DocumentFile, TimelineRows, TimelineTable } from './plan/types.js';
import { TIMELINE_TABLES } from './plan/types.js';

export interface Storage {
  client: S3Client;
  bucket: string;
}

export interface TableReport {
  table: string;
  planned: number;
  created: number;
  updated: number;
  unchanged: number;
  pruned: number;
  pruneBlocked: number;
}

export interface ApplyReport {
  tables: TableReport[];
  patches: { applied: number; unchanged: number };
  documents: { uploaded: number; unchanged: number };
  identityRepairs: { uploaded: number; alreadyPresent: number };
  overlappingOpenWindowsRemoved: number;
}

/** Fields only set on create: real users change them afterwards (read a notification, view an article). */
const CREATE_ONLY_FIELDS: Partial<Record<TimelineTable, string[]>> = {
  notification: ['read'],
  knowledgeArticle: ['viewCount'],
};

type Delegate = {
  findMany(args: unknown): Promise<Record<string, unknown>[]>;
  createMany(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  deleteMany(args: unknown): Promise<{ count: number }>;
};

function delegate(prisma: PrismaClient, table: string): Delegate {
  return (prisma as unknown as Record<string, Delegate>)[table];
}

function normalize(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object' && 'toNumber' in (value as object)) return (value as { toNumber(): number }).toNumber();
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return value;
}

function differs(planned: Record<string, unknown>, existing: Record<string, unknown>, skip: string[]): string[] {
  return Object.keys(planned).filter((field) => !skip.includes(field) && normalize(planned[field]) !== normalize(existing[field]));
}

const chunked = <T>(items: T[], size: number): T[][] => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------
export interface Scope {
  accountIds: Set<string>;
  patientProfileIds: Set<string>;
  doctorProfileIds: Set<string>;
}

export function scopeOf(population: DemoPopulation): Scope {
  const accountIds = new Set<string>([population.adminAccountId]);
  if (population.hospitalAdminAccountId) accountIds.add(population.hospitalAdminAccountId);
  const patientProfileIds = new Set<string>();
  const doctorProfileIds = new Set<string>();
  for (const doctor of population.doctors.values()) {
    accountIds.add(doctor.accountId);
    doctorProfileIds.add(doctor.profileId);
  }
  for (const patient of population.patients.values()) {
    accountIds.add(patient.accountId);
    patientProfileIds.add(patient.profileId);
  }
  return { accountIds, patientProfileIds, doctorProfileIds };
}

const ACCOUNT_FIELDS = ['accountId', 'ownerAccountId', 'senderAccountId', 'raisedByAccountId', 'resolvedByAccountId', 'moderatedByAccountId'];
const PATIENT_FIELDS = ['patientId', 'patientProfileId'];
const DOCTOR_FIELDS = ['doctorId', 'doctorProfileId', 'authoringDoctorId', 'recordedByDoctorId'];

/** Throws if any planned row references an account or profile outside the demo allow-list. */
export function assertPlanInScope(plan: DemoPlan, scope: Scope): void {
  const violations: string[] = [];
  for (const table of TIMELINE_TABLES) {
    for (const row of plan.rows[table] as Record<string, unknown>[]) {
      if (!isDemoTimelineId(String(row.id))) violations.push(`${table}.${row.id}: id is not a demo-timeline id`);
      for (const field of ACCOUNT_FIELDS) if (row[field] && !scope.accountIds.has(String(row[field]))) violations.push(`${table}.${row.id}.${field}`);
      for (const field of DOCTOR_FIELDS) if (row[field] && !scope.doctorProfileIds.has(String(row[field]))) violations.push(`${table}.${row.id}.${field}`);
      // patientId on these tables is a patient profile id.
      for (const field of PATIENT_FIELDS) if (row[field] && !scope.patientProfileIds.has(String(row[field]))) violations.push(`${table}.${row.id}.${field}`);
    }
  }
  for (const patch of plan.patches) {
    const inScope =
      patch.model === 'account'
        ? scope.accountIds.has(patch.id)
        : patch.model === 'patientProfile'
          ? scope.patientProfileIds.has(patch.id)
          : patch.model === 'doctorProfile'
            ? scope.doctorProfileIds.has(patch.id)
            : true; // verificationCase/notification/hospital ids come from scoped queries (see run.ts)
    if (!inScope) violations.push(`patch ${patch.model}.${patch.id}`);
  }
  if (violations.length > 0) {
    throw new Error(`Refusing to write: ${violations.length} out-of-scope reference(s), e.g. ${violations.slice(0, 5).join('; ')}`);
  }
}

/** The demo-scope filter used when pruning stale timeline rows. */
function pruneWhere(table: TimelineTable, scope: Scope): Record<string, unknown> {
  const patients = { in: [...scope.patientProfileIds] };
  const doctors = { in: [...scope.doctorProfileIds] };
  const accounts = { in: [...scope.accountIds] };
  switch (table) {
    case 'portfolioPublication':
    case 'portfolioAward':
    case 'portfolioWorkExperience':
      return { doctorProfileId: doctors };
    case 'emergencyContact':
      return { patientProfileId: patients };
    case 'healthPassportEntry':
    case 'vitalReading':
    case 'knowledgeArticleSave':
    case 'doctorFollow':
    case 'waitlistEntry':
    case 'messageThread':
    case 'healthGraph':
      return { patientId: patients };
    case 'scheduleException':
    case 'availabilityWindow':
      return { doctorId: doctors };
    case 'appointment':
    case 'paymentTransaction':
    case 'consultationFeedback':
      return { patientId: patients, doctorId: doctors };
    case 'consultationSession':
    case 'dispute':
      return { appointment: { patientId: patients } };
    case 'healthGraphNode':
    case 'healthJourney':
      return { healthGraph: { patientId: patients } };
    case 'journeyNodeLink':
      return { journey: { healthGraph: { patientId: patients } } };
    case 'clinicalNote':
    case 'prescription':
    case 'labRequest':
    case 'followUpRecommendation':
      return { authoringDoctorId: doctors };
    case 'prescriptionLineItem':
      return { prescription: { authoringDoctorId: doctors } };
    case 'mediaAsset':
      return { ownerAccountId: accounts };
    case 'message':
      return { thread: { patientId: patients } };
    case 'knowledgeArticle':
      return { authoringDoctorId: doctors };
    case 'notification':
      return { accountId: accounts };
  }
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------
export async function applyPlan(
  prisma: PrismaClient,
  plan: DemoPlan,
  scope: Scope,
  options: { dryRun: boolean; storage?: Storage; log: (line: string) => void },
): Promise<ApplyReport> {
  const { dryRun, log } = options;
  const report: ApplyReport = {
    tables: [],
    patches: { applied: 0, unchanged: 0 },
    documents: { uploaded: 0, unchanged: 0 },
    identityRepairs: { uploaded: 0, alreadyPresent: 0 },
    overlappingOpenWindowsRemoved: 0,
  };

  assertPlanInScope(plan, scope);

  // Documents are rendered first so their real byte size lands on the MediaAsset row.
  if (options.storage) {
    await syncDocuments(plan.documents, plan.rows, options.storage, dryRun, report, log);
    await repairIdentityDocuments(plan.identityRepairs, options.storage, dryRun, report, log);
  }

  await applyPatches(prisma, plan, dryRun, report);

  // Open, never-booked windows of demo doctors that overlap a planned booking carry
  // no commitment (the product itself voids them, see VoidStaleAvailabilityWindowUseCase).
  report.overlappingOpenWindowsRemoved = await removeOverlappingOpenWindows(prisma, plan.rows.availabilityWindow, scope, dryRun);

  for (const table of TIMELINE_TABLES) {
    report.tables.push(await syncTable(prisma, table, plan.rows[table] as Record<string, unknown>[], dryRun));
  }

  // Prune in reverse dependency order.
  for (const table of [...TIMELINE_TABLES].reverse()) {
    const planned = new Set((plan.rows[table] as { id: string }[]).map((row) => row.id));
    const candidates = await delegate(prisma, table).findMany({ where: pruneWhere(table, scope), select: { id: true } });
    const stale = candidates.map((row) => String(row.id)).filter((id) => isDemoTimelineId(id) && !planned.has(id));
    const entry = report.tables.find((t) => t.table === table)!;
    if (stale.length === 0) continue;
    if (dryRun) {
      entry.pruned = stale.length;
      continue;
    }
    for (const ids of chunked(stale, 200)) {
      try {
        const { count } = await delegate(prisma, table).deleteMany({ where: { id: { in: ids } } });
        entry.pruned += count;
      } catch {
        // Something outside the timeline (real usage) references these rows: leave them.
        for (const id of ids) {
          try {
            entry.pruned += (await delegate(prisma, table).deleteMany({ where: { id } })).count;
          } catch {
            entry.pruneBlocked += 1;
          }
        }
      }
    }
  }

  return report;
}

async function syncTable(prisma: PrismaClient, table: TimelineTable, rows: Record<string, unknown>[], dryRun: boolean): Promise<TableReport> {
  const result: TableReport = { table, planned: rows.length, created: 0, updated: 0, unchanged: 0, pruned: 0, pruneBlocked: 0 };
  if (rows.length === 0) return result;
  const model = delegate(prisma, table);
  const existing = new Map<string, Record<string, unknown>>();
  for (const ids of chunked(rows.map((row) => String(row.id)), 500)) {
    for (const row of await model.findMany({ where: { id: { in: ids } } })) existing.set(String(row.id), row);
  }

  const toCreate: Record<string, unknown>[] = [];
  const toUpdate: { id: string; data: Record<string, unknown> }[] = [];
  const skip = CREATE_ONLY_FIELDS[table] ?? [];
  for (const row of rows) {
    const current = existing.get(String(row.id));
    if (!current) {
      toCreate.push(row);
      continue;
    }
    const changed = differs(row, current, skip);
    // Read receipts a real user set later are kept.
    const filtered = changed.filter((field) => !(['readAt', 'patientLastReadAt', 'doctorLastReadAt'].includes(field) && current[field] !== null && row[field] === null));
    if (filtered.length === 0) {
      result.unchanged += 1;
      continue;
    }
    if (process.env.DEMO_DEBUG === '1') {
      for (const field of filtered) console.info(`    ~ ${table}.${String(row.id)}.${field}: ${String(normalize(current[field]))} -> ${String(normalize(row[field]))}`);
    }
    toUpdate.push({ id: String(row.id), data: Object.fromEntries(filtered.map((field) => [field, row[field]])) });
  }

  result.created = toCreate.length;
  result.updated = toUpdate.length;
  if (dryRun) return result;

  // Self-referencing rows (reschedules, superseding nodes, addenda) were sorted after their targets.
  for (const batch of chunked(toCreate, 250)) {
    await model.createMany({ data: batch });
  }
  for (const update of toUpdate) {
    await model.update({ where: { id: update.id }, data: update.data });
  }
  return result;
}

async function applyPatches(prisma: PrismaClient, plan: DemoPlan, dryRun: boolean, report: ApplyReport): Promise<void> {
  // Merge patches per row (later patches win on the same field).
  const merged = new Map<string, { model: string; id: string; data: Record<string, unknown> }>();
  for (const patch of plan.patches) {
    const key = `${patch.model}:${patch.id}`;
    const entry = merged.get(key) ?? { model: patch.model, id: patch.id, data: {} };
    Object.assign(entry.data, patch.data);
    merged.set(key, entry);
  }
  for (const { model, id, data } of merged.values()) {
    const model$ = (prisma as unknown as Record<string, { findUnique(args: unknown): Promise<Record<string, unknown> | null>; update(args: unknown): Promise<unknown> }>)[model];
    const current = await model$.findUnique({ where: { id } });
    if (!current) continue;
    const next = { ...data };
    if ('__appendLanguages' in next) {
      const extra = next.__appendLanguages as string[];
      delete next.__appendLanguages;
      const languages = (current.languages as string[]) ?? [];
      const merged$ = [...languages, ...extra.filter((language) => !languages.includes(language))];
      if (merged$.length !== languages.length) next.languages = merged$;
    }
    const changed = Object.keys(next).filter((field) => normalize(next[field]) !== normalize(current[field]));
    if (changed.length === 0) {
      report.patches.unchanged += 1;
      continue;
    }
    report.patches.applied += 1;
    if (!dryRun) await model$.update({ where: { id }, data: Object.fromEntries(changed.map((field) => [field, next[field]])) });
  }
}

async function removeOverlappingOpenWindows(prisma: PrismaClient, planned: TimelineRows['availabilityWindow'], scope: Scope, dryRun: boolean): Promise<number> {
  if (planned.length === 0) return 0;
  const plannedIds = new Set(planned.map((row) => row.id));
  const open = await prisma.availabilityWindow.findMany({
    where: { doctorId: { in: [...scope.doctorProfileIds] }, status: 'OPEN', appointments: { none: {} } },
    select: { id: true, doctorId: true, startTime: true, endTime: true },
  });
  const byDoctor = new Map<string, { start: number; end: number }[]>();
  for (const row of planned) {
    const list = byDoctor.get(String(row.doctorId)) ?? [];
    list.push({ start: new Date(row.startTime).getTime(), end: new Date(row.endTime).getTime() });
    byDoctor.set(String(row.doctorId), list);
  }
  const overlapping = open
    .filter((window) => !plannedIds.has(window.id))
    .filter((window) => (byDoctor.get(window.doctorId) ?? []).some((slot) => window.startTime.getTime() < slot.end && slot.start < window.endTime.getTime()))
    .map((window) => window.id);
  if (!dryRun && overlapping.length > 0) {
    for (const ids of chunked(overlapping, 200)) await prisma.availabilityWindow.deleteMany({ where: { id: { in: ids }, status: 'OPEN', appointments: { none: {} } } });
  }
  return overlapping.length;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
async function headMetadata(storage: Storage, key: string): Promise<Record<string, string> | null> {
  try {
    const head = await storage.client.send(new HeadObjectCommand({ Bucket: storage.bucket, Key: key }));
    return head.Metadata ?? {};
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404 || (error as { name?: string }).name === 'NotFound') return null;
    throw error;
  }
}

async function syncDocuments(documents: DocumentFile[], rows: TimelineRows, storage: Storage, dryRun: boolean, report: ApplyReport, log: (line: string) => void): Promise<void> {
  for (const document of documents) {
    const fingerprint = renderFingerprint(document.render);
    const { body, contentType } = await renderDocument(document.render);
    const asset = rows.mediaAsset.find((row) => row.id === document.assetId);
    if (asset) asset.sizeEstimate = body.length;
    const metadata = await headMetadata(storage, document.storageKey);
    if (metadata && metadata['demo-fingerprint'] === fingerprint) {
      report.documents.unchanged += 1;
      continue;
    }
    report.documents.uploaded += 1;
    if (dryRun) continue;
    await storage.client.send(
      new PutObjectCommand({ Bucket: storage.bucket, Key: document.storageKey, Body: body, ContentType: contentType, Metadata: { 'demo-fingerprint': fingerprint, 'demo-synthetic': 'true' } }),
    );
  }
  if (documents.length > 0) log(`  documents: ${report.documents.uploaded} uploaded, ${report.documents.unchanged} unchanged`);
}

/** D2: the identity seed creates verification MediaAsset rows with no object behind them. Upload a SPECIMEN image where (and only where) none exists. */
async function repairIdentityDocuments(repairs: DocumentFile[], storage: Storage, dryRun: boolean, report: ApplyReport, log: (line: string) => void): Promise<void> {
  for (const repair of repairs) {
    const metadata = await headMetadata(storage, repair.storageKey);
    if (metadata) {
      report.identityRepairs.alreadyPresent += 1;
      continue;
    }
    report.identityRepairs.uploaded += 1;
    if (dryRun) continue;
    const { body } = await renderDocument(repair.render);
    // The seed recorded these assets as image/png, so the object matches the row's content type.
    await storage.client.send(
      new PutObjectCommand({ Bucket: storage.bucket, Key: repair.storageKey, Body: body, ContentType: 'image/png', Metadata: { 'demo-fingerprint': renderFingerprint(repair.render), 'demo-synthetic': 'true' } }),
    );
  }
  if (repairs.length > 0) log(`  identity documents: ${report.identityRepairs.uploaded} repaired, ${report.identityRepairs.alreadyPresent} already present`);
}
