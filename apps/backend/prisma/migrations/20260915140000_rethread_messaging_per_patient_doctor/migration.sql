-- Messages Page Overhaul, Phase 1: re-thread MessageThread from one thread
-- per Appointment to one thread per (patientId, doctorId) PAIR. Every
-- appointment a patient/doctor pair has ever had together now lives inside
-- a single continuous conversation instead of fragmenting into one thread
-- per booking.
--
-- THIS MIGRATION IS ONE-WAY / NOT REVERSIBLE, consistent with this
-- schema's existing forward-only convention (no down-migrations anywhere
-- in this project): merging multiple appointment-scoped threads into one
-- per-pair thread destroys the appointment<->thread mapping. There is no
-- way to reconstruct "which thread used to belong to which appointment"
-- from the merged state afterward. Old bookmarked ?thread=<id> links (none
-- exist in production yet -- that URL state doesn't ship until Phase 3)
-- will 404 post-migration -- acceptable, and post-migration thread ids are
-- stable going forward.
--
-- ORDERING NOTE (load-bearing, caught in review of the first draft of this
-- migration): the merge (re-pointing every non-keeper thread's messages
-- onto its pair's keeper) MUST happen BEFORE both the lastMessageAt and
-- read-marker backfills below. A first draft computed those backfills
-- per-thread first and merged second -- which silently under-reported a
-- keeper's read/activity history, because at backfill time the keeper only
-- "knew about" its own original messages, not the ones about to be merged
-- in from its pair's other thread(s). Backfilling AFTER the merge means
-- every computation below already sees the pair's full, final message set.
--
-- Read-marker backfill choice (see the backfill step below), spelled out
-- because it is a real product decision, not an implementation detail: for
-- each side (patient/doctor), patientLastReadAt/doctorLastReadAt is
-- backfilled to the MAX(createdAt) of messages that side actually marked
-- read (readAt IS NOT NULL, sent by the OTHER party -- a side can't "read"
-- its own message), falling back to now() (migration execution time) only
-- when that side never read anything from the other party. Never left
-- NULL: NULL would make every historical message "unread" the instant the
-- unread badge ships, spiking every user's unread count to their entire
-- message history on first login post-migration. Using now() as the
-- no-real-data fallback is a deliberate, disclosed inaccuracy (it
-- under-counts a side that genuinely never opened a thread as "caught up
-- as of migration time") traded off against not showing a nonsensical
-- unread-history spike -- this is the tradeoff the implementation plan
-- explicitly sanctioned ("either is defensible, but it must be one of
-- these, not null").
--
-- Notification-module cross-reference check (done before writing this
-- migration, per the plan): grepped the Notification module for any stored
-- messageThreadId (or any other MessageThread reference) outside this
-- module's own tables -- none exists, so no remap of a stored foreign
-- reference is needed here.

-- Step 1: add the three new columns (nullable for now -- lastMessageAt is
-- made NOT NULL only after it's backfilled, in Step 4).
ALTER TABLE "MessageThread" ADD COLUMN "lastMessageAt" TIMESTAMP(3);
ALTER TABLE "MessageThread" ADD COLUMN "patientLastReadAt" TIMESTAMP(3);
ALTER TABLE "MessageThread" ADD COLUMN "doctorLastReadAt" TIMESTAMP(3);

-- Step 2: for every (patientId, doctorId) pair with more than one thread,
-- pick the EARLIEST-CREATED thread as the keeper, then re-point every
-- Message on every other thread for that pair onto the keeper. Messages
-- are UPDATEd, never deleted -- preserving full history across every
-- appointment the pair ever had is the entire point of this merge. Because
-- each message keeps its own original createdAt and only its threadId
-- changes, reading the keeper's messages back ordered by createdAt
-- naturally interleaves messages from every source thread into true
-- chronological order -- never grouped by which thread a message
-- originally lived in.
WITH keepers AS (
  SELECT DISTINCT ON ("patientId", "doctorId") id, "patientId", "doctorId"
  FROM "MessageThread"
  ORDER BY "patientId", "doctorId", "createdAt" ASC, id ASC
),
non_keepers AS (
  SELECT t.id AS old_thread_id, k.id AS keeper_id
  FROM "MessageThread" t
  JOIN keepers k ON k."patientId" = t."patientId" AND k."doctorId" = t."doctorId"
  WHERE t.id != k.id
)
UPDATE "Message" m
SET "threadId" = nk.keeper_id
FROM non_keepers nk
WHERE m."threadId" = nk.old_thread_id;

-- Step 3: delete the now-empty non-keeper threads. Every message they had
-- was re-pointed in Step 2 above; nothing about a real message is ever
-- destroyed, only the extra thread rows that used to fragment one
-- relationship's history across many bookings. Done before the backfills
-- below so every surviving thread's own id is now the sole thread for its
-- pair -- the backfill queries need not care about keepers/non-keepers at
-- all.
WITH keepers AS (
  SELECT DISTINCT ON ("patientId", "doctorId") id
  FROM "MessageThread"
  ORDER BY "patientId", "doctorId", "createdAt" ASC, id ASC
)
DELETE FROM "MessageThread" t
WHERE NOT EXISTS (SELECT 1 FROM keepers k WHERE k.id = t.id);

-- Step 4: backfill lastMessageAt and the read markers from each surviving
-- thread's FINAL, post-merge message set (see the ordering note above for
-- why this must run after Steps 2-3, not before).
UPDATE "MessageThread" t
SET "lastMessageAt" = COALESCE(
  (SELECT MAX(m."createdAt") FROM "Message" m WHERE m."threadId" = t.id),
  t."createdAt"
);

UPDATE "MessageThread" t
SET "patientLastReadAt" = COALESCE(
  (
    SELECT MAX(m."createdAt")
    FROM "Message" m
    WHERE m."threadId" = t.id
      AND m."readAt" IS NOT NULL
      AND m."senderAccountId" != (SELECT p."accountId" FROM "PatientProfile" p WHERE p.id = t."patientId")
  ),
  now()
);

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
);

ALTER TABLE "MessageThread" ALTER COLUMN "lastMessageAt" SET NOT NULL;
ALTER TABLE "MessageThread" ALTER COLUMN "lastMessageAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Step 5: drop appointmentId -- identity is now the (patientId, doctorId)
-- pair, never the originating Appointment.
ALTER TABLE "MessageThread" DROP CONSTRAINT "MessageThread_appointmentId_fkey";
DROP INDEX "MessageThread_appointmentId_key";
ALTER TABLE "MessageThread" DROP COLUMN "appointmentId";

-- Step 6: the new compound identity constraint + inbox-ordering index.
CREATE UNIQUE INDEX "MessageThread_patientId_doctorId_key" ON "MessageThread"("patientId", "doctorId");
CREATE INDEX "MessageThread_lastMessageAt_idx" ON "MessageThread"("lastMessageAt");
