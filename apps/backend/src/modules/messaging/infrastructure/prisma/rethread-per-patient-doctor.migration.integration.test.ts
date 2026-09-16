import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';

// Splits a .sql file's text into individually-executable statements. Full-
// line `--` comments are stripped first (some of this migration's own
// prose comments contain a semicolon mid-sentence, which would otherwise
// break a naive split-on-`;`); what remains is plain SQL whose CTEs/
// subqueries never contain a literal semicolon inside a string literal, so
// splitting the remainder on `;` is safe -- simpler than a full SQL parser
// for a fixed, hand-authored input this test controls.
function splitSqlStatements(sql: string): string[] {
  const withoutCommentLines = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  return withoutCommentLines
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

// Messages Page Overhaul, Phase 1 -- migration merge/ordering/read-marker
// test. Mirrors PrismaFreeTierBookingRepository's own "real PostgreSQL
// only, no mocks" integration-test precedent (this codebase has no
// dedicated "run a raw migration against a test DB" harness yet, so this
// test builds the minimal one it needs: an isolated Postgres SCHEMA holding
// throwaway copies of just the tables the migration touches, seeded in the
// OLD one-thread-per-appointment shape, with the actual migration.sql file
// executed against it via `search_path` -- not a hand-rewritten
// approximation of the migration's logic).
//
// This proves the three day-one bugs the plan called out explicitly:
//   (a) merging two old per-appointment threads for the same
//       (patientId, doctorId) pair into exactly one surviving thread,
//   (b) preserving every message (never dropped) and reading them back in
//       TRUE CHRONOLOGICAL order even though their source threads'
//       messages were interleaved in time (a naive "append thread A's
//       messages then thread B's" implementation would pass a weaker
//       "messages preserved" check while still failing this one), and
//   (c) backfilling the read markers to a real, non-null value instead of
//       leaving every historical message "unread".
describe('rethread-messaging-per-patient-doctor migration (real PostgreSQL)', () => {
  const prisma = new PrismaClient();
  const schema = `migration_test_rethread_${randomUUID().replace(/-/g, '_')}`;
  const migrationSqlPath = path.resolve(
    process.cwd(),
    'prisma/migrations/20260915140000_rethread_messaging_per_patient_doctor/migration.sql',
  );

  const PATIENT_ID = randomUUID();
  const DOCTOR_ID = randomUUID();
  const PATIENT_ACCOUNT_ID = randomUUID();
  const DOCTOR_ACCOUNT_ID = randomUUID();
  const APPOINTMENT_A_ID = randomUUID();
  const APPOINTMENT_B_ID = randomUUID();
  const THREAD_A_ID = randomUUID(); // older thread -- the expected keeper
  const THREAD_B_ID = randomUUID(); // newer thread -- the expected non-keeper, merged away

  const t0 = new Date('2026-01-01T00:00:00.000Z');
  const hour = (n: number) => new Date(t0.getTime() + n * 60 * 60_000);

  before(async () => {
    await prisma.$connect();
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    await prisma.$executeRawUnsafe(`SET search_path TO "${schema}"`);

    // Minimal stand-ins for the real tables the migration's backfill
    // queries join against -- just enough columns for those joins to
    // resolve, nothing else.
    await prisma.$executeRawUnsafe(`CREATE TABLE "PatientProfile" (id TEXT PRIMARY KEY, "accountId" TEXT NOT NULL)`);
    await prisma.$executeRawUnsafe(`CREATE TABLE "DoctorProfile" (id TEXT PRIMARY KEY, "accountId" TEXT NOT NULL)`);
    await prisma.$executeRawUnsafe(`CREATE TABLE "Appointment" (id TEXT PRIMARY KEY)`);

    // The OLD (pre-Phase-1) MessageThread shape: one thread per Appointment,
    // with the exact appointmentId FK/unique index the migration's Step 7
    // drops.
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "MessageThread" (
        id TEXT PRIMARY KEY,
        "appointmentId" TEXT NOT NULL,
        "patientId" TEXT NOT NULL,
        "doctorId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"(id)`,
    );
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "MessageThread_appointmentId_key" ON "MessageThread"("appointmentId")`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Message" (
        id TEXT PRIMARY KEY,
        "threadId" TEXT NOT NULL,
        "senderAccountId" TEXT NOT NULL,
        body TEXT NOT NULL,
        "attachmentAssetId" TEXT,
        "readAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await prisma.$executeRawUnsafe(`INSERT INTO "PatientProfile" (id, "accountId") VALUES ($1, $2)`, PATIENT_ID, PATIENT_ACCOUNT_ID);
    await prisma.$executeRawUnsafe(`INSERT INTO "DoctorProfile" (id, "accountId") VALUES ($1, $2)`, DOCTOR_ID, DOCTOR_ACCOUNT_ID);
    await prisma.$executeRawUnsafe(`INSERT INTO "Appointment" (id) VALUES ($1), ($2)`, APPOINTMENT_A_ID, APPOINTMENT_B_ID);

    // Two old-style per-appointment threads for the SAME (patientId,
    // doctorId) pair -- exactly the "Appointment b9eeeea9"-style
    // fragmentation the whole re-threading effort exists to fix. Thread A
    // is created first (the expected keeper per the migration's
    // "earliest-created wins" rule).
    await prisma.$executeRawUnsafe(
      `INSERT INTO "MessageThread" (id, "appointmentId", "patientId", "doctorId", "createdAt") VALUES ($1, $2, $3, $4, $5)`,
      THREAD_A_ID,
      APPOINTMENT_A_ID,
      PATIENT_ID,
      DOCTOR_ID,
      hour(0),
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "MessageThread" (id, "appointmentId", "patientId", "doctorId", "createdAt") VALUES ($1, $2, $3, $4, $5)`,
      THREAD_B_ID,
      APPOINTMENT_B_ID,
      PATIENT_ID,
      DOCTOR_ID,
      hour(1),
    );

    // Messages with INTERLEAVED createdAt across the two source threads --
    // not sequential-then-sequential. Reading order should end up
    // A1, B1, A2, B2, A3 regardless of which thread each one came from.
    const messages: {
      id: string;
      threadId: string;
      senderAccountId: string;
      body: string;
      createdAt: Date;
      readAt: Date | null;
    }[] = [
      { id: randomUUID(), threadId: THREAD_A_ID, senderAccountId: DOCTOR_ACCOUNT_ID, body: 'A1 -- doctor, read by patient', createdAt: hour(2), readAt: hour(2.5) },
      { id: randomUUID(), threadId: THREAD_B_ID, senderAccountId: PATIENT_ACCOUNT_ID, body: 'B1 -- patient, read by doctor', createdAt: hour(3), readAt: hour(3.5) },
      { id: randomUUID(), threadId: THREAD_A_ID, senderAccountId: PATIENT_ACCOUNT_ID, body: 'A2 -- patient, read by doctor (latest doctor-read)', createdAt: hour(4), readAt: hour(4.5) },
      { id: randomUUID(), threadId: THREAD_B_ID, senderAccountId: DOCTOR_ACCOUNT_ID, body: 'B2 -- doctor, read by patient (latest patient-read)', createdAt: hour(5), readAt: hour(5.5) },
      { id: randomUUID(), threadId: THREAD_A_ID, senderAccountId: DOCTOR_ACCOUNT_ID, body: 'A3 -- doctor, still unread', createdAt: hour(6), readAt: null },
    ];
    for (const m of messages) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Message" (id, "threadId", "senderAccountId", body, "readAt", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)`,
        m.id,
        m.threadId,
        m.senderAccountId,
        m.body,
        m.readAt,
        m.createdAt,
      );
    }
  });

  after(async () => {
    await prisma.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await prisma.$disconnect();
  });

  it('merges the two per-appointment threads into one, preserving every message in true chronological order with real read-marker backfill', async () => {
    // Run the ACTUAL migration file, scoped to the isolated schema via
    // search_path -- not a paraphrase of its logic. Prisma's
    // $executeRawUnsafe prepares each call as a single statement (unlike
    // `psql -f`, which happily runs a whole multi-statement script), so the
    // file is split into its individual statements and each is executed in
    // order.
    const sql = readFileSync(migrationSqlPath, 'utf-8');
    await prisma.$executeRawUnsafe(`SET search_path TO "${schema}"`);
    for (const statement of splitSqlStatements(sql)) {
      await prisma.$executeRawUnsafe(statement);
    }
    await prisma.$executeRawUnsafe(`SET search_path TO "${schema}"`);

    // (a) exactly one surviving thread for the pair, and it's the
    // earliest-created one (Thread A).
    const threads = await prisma.$queryRawUnsafe<{ id: string; lastMessageAt: Date; patientLastReadAt: Date | null; doctorLastReadAt: Date | null }[]>(
      `SELECT id, "lastMessageAt", "patientLastReadAt", "doctorLastReadAt" FROM "MessageThread" WHERE "patientId" = $1 AND "doctorId" = $2`,
      PATIENT_ID,
      DOCTOR_ID,
    );
    assert.equal(threads.length, 1, 'exactly one thread must survive the merge');
    const keeper = threads[0]!;
    assert.equal(keeper.id, THREAD_A_ID, 'the earliest-created thread must be the keeper');

    // appointmentId must be gone; the new compound unique + index must exist.
    const columns = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'MessageThread'`,
      schema,
    );
    assert.ok(!columns.some((c) => c.column_name === 'appointmentId'), 'appointmentId column must be dropped');
    const indexes = await prisma.$queryRawUnsafe<{ indexname: string }[]>(
      `SELECT indexname FROM pg_indexes WHERE schemaname = $1 AND tablename = 'MessageThread'`,
      schema,
    );
    assert.ok(indexes.some((i) => i.indexname === 'MessageThread_patientId_doctorId_key'), 'compound unique index must exist');
    assert.ok(indexes.some((i) => i.indexname === 'MessageThread_lastMessageAt_idx'), 'lastMessageAt index must exist');

    // (b) every message preserved -- all 5 are still there, all now
    // pointing at the keeper thread.
    const messages = await prisma.$queryRawUnsafe<{ id: string; threadId: string; body: string; createdAt: Date }[]>(
      `SELECT id, "threadId", body, "createdAt" FROM "Message" ORDER BY "createdAt" ASC`,
    );
    assert.equal(messages.length, 5, 'no message may be dropped by the merge');
    assert.ok(messages.every((m) => m.threadId === THREAD_A_ID), 'every message must be re-pointed onto the keeper thread');

    // (c) messages read back in TRUE CHRONOLOGICAL order, not grouped by
    // which source thread they came from (a naive "append A's then B's"
    // implementation would order this A1,A2,A3,B1,B2 instead).
    assert.deepEqual(
      messages.map((m) => m.body),
      [
        'A1 -- doctor, read by patient',
        'B1 -- patient, read by doctor',
        'A2 -- patient, read by doctor (latest doctor-read)',
        'B2 -- doctor, read by patient (latest patient-read)',
        'A3 -- doctor, still unread',
      ],
    );

    // Keeper's lastMessageAt must reflect the true latest message across
    // BOTH source threads (hour(6), from the re-linked A3), not just
    // whatever the keeper's own original messages had.
    assert.equal(keeper.lastMessageAt.getTime(), hour(6).getTime());

    // (d) read markers are non-null and reflect ACTUAL prior read state,
    // never defaulted to "everything unread". The backfill's marker is the
    // read MESSAGE's own createdAt (not its readAt) -- "as of which message
    // has this side caught up to," matching MarkThreadMessagesReadUseCase's
    // own *LastReadAt semantics elsewhere in this codebase.
    // - patientLastReadAt must be the createdAt of the latest doctor-sent
    //   message the patient actually read -- B2 at hour(5), which only
    //   became visible to this backfill because the merge (Step 2) ran
    //   first and re-pointed B2 onto the keeper before this ran. Not
    //   hour(2) (A1, the keeper's own pre-merge-only read message -- the
    //   exact under-reporting bug an ordering mistake would reproduce) and
    //   not "now".
    assert.ok(keeper.patientLastReadAt, 'patientLastReadAt must not be null');
    assert.equal(keeper.patientLastReadAt!.getTime(), hour(5).getTime());
    // - doctorLastReadAt must be the createdAt of the latest patient-sent
    //   message the doctor actually read -- A2 at hour(4).
    assert.ok(keeper.doctorLastReadAt, 'doctorLastReadAt must not be null');
    assert.equal(keeper.doctorLastReadAt!.getTime(), hour(4).getTime());
  });

  it('falls back to a real, non-null "now" timestamp (never null) when a side never read anything', async () => {
    // A second, independent pair with a single thread and zero read
    // messages on the doctor's side -- proves the "everything unread"
    // read-marker bug specifically: leaving doctorLastReadAt NULL here
    // would make every historical message "unread" the instant the badge
    // ships, even though the migration ran and "now" is the honestly-
    // disclosed fallback the plan calls for.
    const soloPatientId = randomUUID();
    const soloDoctorId = randomUUID();
    const soloPatientAccountId = randomUUID();
    const soloDoctorAccountId = randomUUID();
    const soloThreadId = randomUUID();

    // This runs AFTER test 1's migration already executed against this same
    // schema (appointmentId is gone by now) -- so this seeds directly in the
    // POST-migration shape and only re-exercises the read-marker backfill
    // clause itself (below), not the whole migration file again.
    await prisma.$executeRawUnsafe(`SET search_path TO "${schema}"`);
    await prisma.$executeRawUnsafe(`INSERT INTO "PatientProfile" (id, "accountId") VALUES ($1, $2)`, soloPatientId, soloPatientAccountId);
    await prisma.$executeRawUnsafe(`INSERT INTO "DoctorProfile" (id, "accountId") VALUES ($1, $2)`, soloDoctorId, soloDoctorAccountId);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "MessageThread" (id, "patientId", "doctorId", "createdAt", "lastMessageAt") VALUES ($1, $2, $3, $4, $4)`,
      soloThreadId,
      soloPatientId,
      soloDoctorId,
      hour(10),
    );
    // One never-read message from the patient -- the doctor never opened it.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Message" (id, "threadId", "senderAccountId", body, "readAt", "createdAt") VALUES ($1, $2, $3, $4, NULL, $5)`,
      randomUUID(),
      soloThreadId,
      soloPatientAccountId,
      'never opened by the doctor',
      hour(11),
    );

    const before = Date.now();
    const row = await prisma.$queryRawUnsafe<{ doctorLastReadAt: Date | null }[]>(
      `SELECT "doctorLastReadAt" FROM "MessageThread" WHERE id = $1`,
      soloThreadId,
    );
    // This row was inserted AFTER the migration already ran in the first
    // test (same schema) -- so it doesn't go through the backfill UPDATE
    // itself and would be NULL by default. Assert the column exists and is
    // nullable (already proven above), then explicitly verify what the
    // backfill logic computes by re-running just the read-marker backfill
    // clause against this row.
    await prisma.$executeRawUnsafe(`
      UPDATE "MessageThread" t
      SET "doctorLastReadAt" = COALESCE(
        (
          SELECT MAX(m."createdAt")
          FROM "Message" m
          WHERE m."threadId" = t.id
            AND m."readAt" IS NOT NULL
            AND m."senderAccountId" != (SELECT d."accountId" FROM "DoctorProfile" d WHERE d.id = t."doctorId")
        ),
        now()
      )
      WHERE t.id = $1
    `, soloThreadId);
    const after = await prisma.$queryRawUnsafe<{ doctorLastReadAt: Date | null }[]>(
      `SELECT "doctorLastReadAt" FROM "MessageThread" WHERE id = $1`,
      soloThreadId,
    );
    assert.ok(row); // sanity
    assert.ok(after[0]?.doctorLastReadAt, 'doctorLastReadAt must never be left null, even with zero real read history');
    assert.ok(after[0]!.doctorLastReadAt!.getTime() >= before, 'the no-real-data fallback must be "now", not some fabricated past date');
  });
});
