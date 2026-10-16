/**
 * Demo timeline -- shared primitives: deterministic ids, seeded randomness,
 * Africa/Cairo calendar arithmetic, the demo-account allow-list and the
 * safety guards every write path goes through.
 *
 * Nothing here touches the database.
 */
import { createHash } from 'node:crypto';

import { zonedTimeToUtc } from '../../src/shared/date/timezone.js';

// ---------------------------------------------------------------------------
// Deterministic ids
// ---------------------------------------------------------------------------
// Every row the demo timeline owns gets a UUIDv5 derived from a stable
// semantic key ("appointment:doctor03:patient03:4"). Re-running with the same
// plan updates the same rows in place; re-running with a new anchor moves
// their timestamps without creating duplicates. A v5 id is also how
// timeline-owned rows are told apart from rows created by real usage (v4,
// `randomUUID()`), which the timeline never rewrites.
const DEMO_NAMESPACE = '6f1d3c52-8a7e-4b0f-9c1e-0d5a7e2b4c91';

function uuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ''), 'hex');
}

export function demoId(key: string): string {
  const hash = createHash('sha1').update(uuidToBytes(DEMO_NAMESPACE)).update(key).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function isDemoTimelineId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

// ---------------------------------------------------------------------------
// Seeded randomness
// ---------------------------------------------------------------------------
// One independent stream per semantic scope (`rng('doctor03:reviews')`), so
// adding a review template never reshuffles who booked whom.
export interface Rng {
  next(): number;
  int(minInclusive: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
  chance(probability: number): boolean;
  shuffle<T>(items: readonly T[]): T[];
}

export function rng(scope: string): Rng {
  let state = createHash('sha256').update(scope).digest().readUInt32LE(0);
  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    pick: <T>(items: readonly T[]): T => items[int(0, items.length - 1)],
    chance: (probability: number): boolean => next() < probability,
    shuffle: <T>(items: readonly T[]): T[] => {
      const copy = [...items];
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swap = int(0, index);
        [copy[index], copy[swap]] = [copy[swap], copy[index]];
      }
      return copy;
    },
  };
}

// ---------------------------------------------------------------------------
// Africa/Cairo calendar
// ---------------------------------------------------------------------------
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

/** A Cairo calendar day, independent of the process timezone. */
export interface CairoDay {
  year: number;
  /** 0-based, like Date. */
  month: number;
  day: number;
}

const cairoParts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Africa/Cairo',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
});

export function toCairo(instant: Date): CairoDay & { hours: number; minutes: number; weekday: number } {
  const parts = Object.fromEntries(cairoParts.formatToParts(instant).map((part) => [part.type, part.value]));
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    year: Number(parts.year),
    month: Number(parts.month) - 1,
    day: Number(parts.day),
    hours: Number(parts.hour),
    minutes: Number(parts.minute),
    weekday: weekdays.indexOf(parts.weekday),
  };
}

export function cairoDayOf(instant: Date): CairoDay {
  const { year, month, day } = toCairo(instant);
  return { year, month, day };
}

export function addDays(day: CairoDay, days: number): CairoDay {
  const shifted = new Date(Date.UTC(day.year, day.month, day.day + days));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate() };
}

/** 0 = Sunday ... 6 = Saturday, for the Cairo calendar day itself. */
export function weekdayOf(day: CairoDay): number {
  return new Date(Date.UTC(day.year, day.month, day.day)).getUTCDay();
}

export function dayKey(day: CairoDay): string {
  return `${day.year}-${String(day.month + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
}

/** Cairo wall-clock time on a Cairo day -> the real UTC instant (DST-aware, via the backend's own helper). */
export function cairoInstant(day: CairoDay, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return zonedTimeToUtc(day.year, day.month, day.day, hours, minutes);
}

/** The UTC-midnight Date the scheduling module stores for a date-only value (ScheduleException.date, Holiday.date). */
export function utcMidnightOf(day: CairoDay): Date {
  return new Date(Date.UTC(day.year, day.month, day.day));
}

export function daysBetween(from: CairoDay, to: CairoDay): number {
  return Math.round((Date.UTC(to.year, to.month, to.day) - Date.UTC(from.year, from.month, from.day)) / MS_PER_DAY);
}

export function plusMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * MS_PER_MINUTE);
}

export function minutesOf(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

export function hhmmOf(totalMinutes: number): string {
  return `${String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Anchor
// ---------------------------------------------------------------------------
/**
 * The demo timeline's "now". Every timestamp is computed from it, so the same
 * anchor always yields the same rows, and a new anchor slides the whole
 * timeline (history, today's queue, upcoming bookings) forward together.
 *
 * Accepted: an ISO instant ("2026-10-13T08:00:00Z"), or a Cairo date with an
 * optional Cairo wall-clock time ("2026-10-13", "2026-10-13 11:00").
 * Default: the current time floored to 5 minutes. Upcoming visits are planned
 * at least 20 minutes after the anchor, so at seed time every one of them is
 * still genuinely ahead; pass --anchor for a reproducible run.
 */
export function parseAnchor(raw: string | undefined, now: Date = new Date()): Date {
  if (!raw) {
    const step = 5 * MS_PER_MINUTE;
    return new Date(Math.floor(now.getTime() / step) * step);
  }
  const trimmed = raw.trim();
  const local = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/.exec(trimmed);
  if (local) {
    const [, year, month, day, hours, minutes] = local;
    return cairoInstant(
      { year: Number(year), month: Number(month) - 1, day: Number(day) },
      `${hours ?? '11'}:${minutes ?? '00'}`,
    );
  }
  const instant = new Date(trimmed);
  if (Number.isNaN(instant.getTime())) {
    throw new Error(`Invalid demo anchor "${raw}". Use an ISO instant or "YYYY-MM-DD[ HH:MM]" (Cairo time).`);
  }
  return instant;
}

// ---------------------------------------------------------------------------
// Allow-list
// ---------------------------------------------------------------------------
const pad = (n: number): string => String(n).padStart(2, '0');

export const DEMO_DOCTOR_EMAILS = Array.from({ length: 20 }, (_, i) => `doctor${pad(i + 1)}@orivex.dev`);
export const DEMO_PATIENT_EMAILS = Array.from({ length: 20 }, (_, i) => `patient${pad(i + 1)}@orivex.dev`);
export const DEMO_ADMIN_EMAIL = 'admin@orivex.dev';
export const DEMO_HOSPITAL_ADMIN_EMAIL = 'hospitaladmin@orivex.dev';

/** The only accounts the demo timeline may create rows for or modify. */
export const DEMO_ACCOUNT_EMAILS: ReadonlySet<string> = new Set([
  ...DEMO_DOCTOR_EMAILS,
  ...DEMO_PATIENT_EMAILS,
  DEMO_ADMIN_EMAIL,
  DEMO_HOSPITAL_ADMIN_EMAIL,
]);

export function assertDemoEmail(email: string): void {
  if (!DEMO_ACCOUNT_EMAILS.has(email)) {
    throw new Error(`Refusing to touch "${email}": not on the demo-account allow-list.`);
  }
}

// ---------------------------------------------------------------------------
// Environment guard
// ---------------------------------------------------------------------------
/**
 * Refuses any database that isn't on this machine unless BOTH an explicit
 * flag and an environment acknowledgement are given. The hosted database holds
 * real accounts; running there needs the owner's explicit approval first.
 */
export function assertSafeDatabase(databaseUrl: string | undefined, allowRemote: boolean): void {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set.');
  }
  let hostname: string;
  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    throw new Error('DATABASE_URL is not a valid connection string.');
  }
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (isLocal) return;
  if (allowRemote && process.env.DEMO_REMOTE_APPROVED === 'yes') {
    console.warn(`!! Running against REMOTE database host "${hostname}" (explicitly approved).`);
    return;
  }
  throw new Error(
    `Refusing to run: DATABASE_URL points at "${hostname}", not this machine. ` +
      'A remote run needs --allow-remote AND DEMO_REMOTE_APPROVED=yes, and the database owner\'s explicit approval.',
  );
}
