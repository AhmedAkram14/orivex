import type {
  DoctorEarningsCycle,
  DoctorEarningsSummary,
  DoctorEarningsTransaction,
  PaymentStatus,
} from '@/features/payment/api/types';
import { LEGACY_DOCTOR_ACCOUNT_ID } from '@/mocks/auth-store';

/**
 * The mock backend's doctor earnings ledger -- a deterministic, seeded list of payment transactions per demo doctor,
 * so the Earnings page has a real-shaped history to show in local development and tests. Both endpoints compute
 * from it exactly as the real backend does (a port of `GetDoctorEarningsSummaryUseCase` and
 * `GetDoctorEarningsTransactionsUseCase`): `createdAt` in [from, to), only Succeeded/Settled are earnings,
 * commission = round2(gross x 0.15), cycles are UTC months, transactions newest first and of every status.
 * A doctor without a seeded ledger (e.g. doctor01) has an honest empty history.
 */

const PLATFORM_COMMISSION_RATE = 0.15;
const EARNED: ReadonlySet<PaymentStatus> = new Set(['succeeded', 'settled']);
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_MS = 30 * DAY_MS;
const HISTORY_DAYS = 220;

const PATIENTS = [
  'Mona Farouk',
  'Ahmed El-Sayed',
  'Layla Ibrahim',
  'Youssef Hassan',
  'Nourhan Abdel Aziz',
  'Karim Mostafa',
  'Sara Zaki',
  'Omar Nabil',
  'Dina El-Masry',
  'Hassan Tawfik',
  'Mariam Adel',
  'Tarek Youssef',
];

/** Which demo doctors have a ledger, and their fee. */
const LEDGERS: Record<string, { fee: number }> = {
  [LEGACY_DOCTOR_ACCOUNT_ID]: { fee: 500 },
  'user-doctor-2': { fee: 380 },
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/** A small deterministic generator (mulberry32), so the history is the same on every load. */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, DoctorEarningsTransaction[]>();

/** The doctor's ledger, newest first, laid out over the ~7 months before "now" (Fridays off). */
function ledger(accountId: string | undefined): DoctorEarningsTransaction[] {
  const config = accountId ? LEDGERS[accountId] : undefined;
  if (!accountId || !config) return [];
  const today = new Date();
  const anchor = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const key = `${accountId}:${anchor}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const next = random(accountId.length * 7919 + config.fee);
  const rows: DoctorEarningsTransaction[] = [];
  let counter = 0;
  for (let daysBack = HISTORY_DAYS; daysBack >= 0; daysBack -= 1) {
    const day = anchor - daysBack * DAY_MS;
    if (new Date(day).getUTCDay() === 5) continue; // Friday
    // Quieter in the earliest months, busier lately.
    const perDay = Math.floor(next() * (daysBack > 120 ? 2 : 3));
    for (let index = 0; index < perDay; index += 1) {
      const at =
        day +
        (9 + Math.floor(next() * 9)) * 60 * 60 * 1000 +
        Math.floor(next() * 4) * 15 * 60 * 1000;
      if (at > Date.now()) continue;
      const roll = next();
      const status: PaymentStatus =
        daysBack <= 1 && roll < 0.15
          ? 'initiated'
          : roll < 0.05
            ? 'refunded'
            : roll < 0.08
              ? 'failed'
              : daysBack > 14
                ? 'settled'
                : 'succeeded';
      const patientIndex = Math.floor(next() * PATIENTS.length);
      counter += 1;
      rows.push({
        id: `earn-${accountId}-${counter}`,
        appointmentId: `appointment-earn-${counter}`,
        consultationSessionId: null,
        patientId: `patient-earn-${patientIndex + 1}`,
        patientName: PATIENTS[patientIndex]!,
        amount: { amount: config.fee, currency: 'EGP' },
        status,
        createdAt: new Date(at).toISOString(),
      });
    }
  }
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  cache.set(key, rows);
  return rows;
}

/** `DoctorEarningsFilterQueryDto.toFilter()`: both optional; trailing 30 days ending now by default. */
export function earningsWindow(params: URLSearchParams): { from: Date; to: Date } {
  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');
  const to = dateTo ? new Date(dateTo) : new Date();
  const from = dateFrom ? new Date(dateFrom) : new Date(to.getTime() - DEFAULT_WINDOW_MS);
  return { from, to };
}

function inWindow(rows: DoctorEarningsTransaction[], window: { from: Date; to: Date }) {
  return rows.filter((row) => {
    const at = Date.parse(row.createdAt);
    return at >= window.from.getTime() && at < window.to.getTime();
  });
}

/** GET /payments/doctor/earnings-transactions -- every status, newest first. */
export function getDoctorEarningsTransactionsMock(
  accountId: string | undefined,
  window: { from: Date; to: Date },
): DoctorEarningsTransaction[] {
  return inWindow(ledger(accountId), window);
}

/** GET /payments/doctor/earnings-summary -- lifetime over the whole ledger, cycles over the window. */
export function getDoctorEarningsSummaryForMock(
  accountId: string | undefined,
  window: { from: Date; to: Date },
): DoctorEarningsSummary {
  const all = ledger(accountId);
  let currency: string | null = null;
  let lifetimeGrossAmount = 0;
  let lifetimeCommissionAmount = 0;
  let lifetimeNetAmount = 0;
  const earned = all.filter((row) => EARNED.has(row.status));
  for (const row of earned) {
    currency ??= row.amount.currency;
    const gross = row.amount.amount;
    const commission = round2(gross * PLATFORM_COMMISSION_RATE);
    lifetimeGrossAmount = round2(lifetimeGrossAmount + gross);
    lifetimeCommissionAmount = round2(lifetimeCommissionAmount + commission);
    lifetimeNetAmount = round2(lifetimeNetAmount + (gross - commission));
  }

  const cycles = new Map<string, DoctorEarningsCycle>();
  for (const row of inWindow(all, window).filter((entry) => EARNED.has(entry.status))) {
    const label = row.createdAt.slice(0, 7);
    const gross = row.amount.amount;
    const commission = round2(gross * PLATFORM_COMMISSION_RATE);
    const existing = cycles.get(label);
    if (existing) {
      existing.grossAmount = round2(existing.grossAmount + gross);
      existing.commissionAmount = round2(existing.commissionAmount + commission);
      existing.netAmount = round2(existing.netAmount + (gross - commission));
      existing.transactionCount += 1;
    } else {
      cycles.set(label, {
        cycleLabel: label,
        grossAmount: round2(gross),
        commissionAmount: round2(commission),
        netAmount: round2(gross - commission),
        transactionCount: 1,
      });
    }
  }

  return {
    currency,
    commissionRate: PLATFORM_COMMISSION_RATE,
    lifetimeGrossAmount,
    lifetimeCommissionAmount,
    lifetimeNetAmount,
    lifetimeTransactionCount: earned.length,
    cycles: [...cycles.values()].sort((a, b) => b.cycleLabel.localeCompare(a.cycleLabel)),
  };
}
