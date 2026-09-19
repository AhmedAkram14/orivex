import { PaymentStatus } from '../../../domain/enums/payment-status.enum.js';
import type { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';

import type { GetDoctorEarningsSummaryQuery } from './get-doctor-earnings-summary.query.js';

// I2 -- Doctor earnings (docs/01-prd.md L15 "earnings dashboard", L94 §2.10,
// L189 "commission taken transparently and disclosed to doctors upfront").
//
// Deliberately derives everything from the existing PaymentTransaction
// ledger rather than a new PayoutStatement/invoice model -- schema.prisma's
// own comment on PaymentTransaction already flags PayoutStatement as
// explicitly out of scope ("PayoutStatement is out of this sprint's scope").
// This use case doesn't reopen that decision; it computes the same numbers
// a payout statement would show, on demand, from data that already exists.
//
// Scope, disclosed: no payout/bank-transfer flow exists (no PSP payout
// integration) -- "running balance" here means lifetime net earnings from
// Succeeded/Settled transactions, not "what's actually been wired to the
// doctor's bank account." That's a genuine limitation, not an oversight.
export const PLATFORM_COMMISSION_RATE = 0.15;

const EARNED_STATUSES = new Set([PaymentStatus.Succeeded, PaymentStatus.Settled]);

export interface DoctorEarningsCycle {
  cycleLabel: string; // "2026-09"
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  transactionCount: number;
}

export interface DoctorEarningsSummary {
  currency: string | null;
  commissionRate: number;
  lifetimeGrossAmount: number;
  lifetimeCommissionAmount: number;
  lifetimeNetAmount: number;
  lifetimeTransactionCount: number;
  cycles: DoctorEarningsCycle[];
}

export class GetDoctorEarningsSummaryUseCase {
  constructor(private readonly paymentTransactionRepository: PaymentTransactionRepository) {}

  async execute(query: GetDoctorEarningsSummaryQuery): Promise<DoctorEarningsSummary> {
    const hasRange = query.dateFrom !== undefined || query.dateTo !== undefined;

    // Lifetime totals are always derived from the full, unfiltered ledger --
    // never from `cycles` -- so a narrow range passed for the cycle
    // breakdown can never shrink them. This is the fix for the bug
    // documented in this use case's own file history: previously lifetime
    // was `cycles.reduce(...)`, and `cycles` came from the same
    // range-filtered query, silently collapsing "lifetime" to whatever
    // range was requested.
    const allTransactions = await this.paymentTransactionRepository.findByDoctorId(query.doctorId);
    const lifetimeEarned = allTransactions.filter((transaction) => EARNED_STATUSES.has(transaction.getStatus()));

    let currency: string | null = null;
    let lifetimeGrossAmount = 0;
    let lifetimeCommissionAmount = 0;
    let lifetimeNetAmount = 0;
    for (const transaction of lifetimeEarned) {
      currency ??= transaction.getAmount().getCurrency();
      const gross = transaction.getAmount().getAmount();
      const commission = round2(gross * PLATFORM_COMMISSION_RATE);
      lifetimeGrossAmount = round2(lifetimeGrossAmount + gross);
      lifetimeCommissionAmount = round2(lifetimeCommissionAmount + commission);
      lifetimeNetAmount = round2(lifetimeNetAmount + (gross - commission));
    }
    const lifetimeTransactionCount = lifetimeEarned.length;

    const rangedTransactions = hasRange
      ? await this.paymentTransactionRepository.findByDoctorId(query.doctorId, {
          from: query.dateFrom,
          to: query.dateTo,
        })
      : allTransactions;
    const rangedEarned = rangedTransactions.filter((transaction) => EARNED_STATUSES.has(transaction.getStatus()));

    const cyclesByLabel = new Map<string, DoctorEarningsCycle>();
    for (const transaction of rangedEarned) {
      const label = cycleLabel(transaction.getCreatedAt());
      const gross = transaction.getAmount().getAmount();
      const commission = round2(gross * PLATFORM_COMMISSION_RATE);
      const existing = cyclesByLabel.get(label);
      if (existing) {
        existing.grossAmount = round2(existing.grossAmount + gross);
        existing.commissionAmount = round2(existing.commissionAmount + commission);
        existing.netAmount = round2(existing.netAmount + (gross - commission));
        existing.transactionCount += 1;
      } else {
        cyclesByLabel.set(label, {
          cycleLabel: label,
          grossAmount: round2(gross),
          commissionAmount: round2(commission),
          netAmount: round2(gross - commission),
          transactionCount: 1,
        });
      }
    }

    const cycles = [...cyclesByLabel.values()].sort((a, b) => b.cycleLabel.localeCompare(a.cycleLabel));

    return {
      currency,
      commissionRate: PLATFORM_COMMISSION_RATE,
      lifetimeGrossAmount,
      lifetimeCommissionAmount,
      lifetimeNetAmount,
      lifetimeTransactionCount,
      cycles,
    };
  }
}

function cycleLabel(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
