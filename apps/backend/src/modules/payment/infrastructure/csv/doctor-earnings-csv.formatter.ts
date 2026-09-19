import type { CsvRow } from '../../../reporting/infrastructure/csv/csv-report.formatter.js';
import type { DoctorEarningsSummary } from '../../application/use-cases/get-doctor-earnings-summary/get-doctor-earnings-summary.use-case.js';
import type { DoctorEarningsTransactionResponseDto } from '../../presentation/dto/doctor-earnings-transaction-response.dto.js';

// Doctor Earnings page rebuild (Phase 2): reuses `CsvRow`/`toCsvString`
// directly from ReportingModule's existing dependency-free formatter
// (apps/backend/.../reporting/infrastructure/csv/csv-report.formatter.ts),
// exactly the same justification as doctor-report-csv.formatter.ts's own
// comment -- that file is a pure utility with zero NestJS/module dependency
// (no provider, no DI token), so importing it here is a plain TypeScript
// import of a pure function, not a module-boundary violation.
export interface DoctorEarningsCsvSections {
  /** One row per lifetime metric (always the full, unfiltered ledger -- see GetDoctorEarningsSummaryUseCase's own comment). */
  lifetime: CsvRow[];
  /** One row per period-scoped cycle (label/gross/commission/net/count) -- a distinct row shape from `lifetime`, so it's its own section (see doctor-report-csv.formatter.ts's own comment on why mixed-shape rows can't share one array). */
  cycles: CsvRow[];
  /**
   * One row per transaction in the selected range, across ALL statuses --
   * including `Refunded` (plan decision 3, refund transparency). These rows
   * are listed for visibility only; a Refunded row's amount is never folded
   * into `lifetime`/`cycles` (those come from the summary use case, which
   * already excludes non-earned statuses).
   */
  transactions: CsvRow[];
}

/**
 * Pure row-shaping for `GET /payments/doctor/earnings-export` -- mirrors the
 * Earnings page's own lifetime tiles, cycles table, and drill-down table
 * (plan decision 1) so the exported CSV never disagrees with what the
 * doctor sees on screen.
 *
 * `transactions` takes `DoctorEarningsTransactionResponseDto[]` (i.e.
 * already name-resolved by the controller) rather than raw domain entities
 * plus a separate id->name map -- patient-name resolution is a
 * presentation-layer concern (PaymentModule has no direct access to
 * Patient/Identity data; see DoctorEarningsTransactionResponseDto's own
 * comment), and the controller has already done that resolution once for
 * the JSON drill-down route. Reusing that same resolved shape here avoids a
 * second, parallel resolution path for the export route.
 */
export function doctorEarningsToCsvRows(
  summary: DoctorEarningsSummary,
  transactions: DoctorEarningsTransactionResponseDto[],
): DoctorEarningsCsvSections {
  const lifetime: CsvRow[] = [
    { metric: 'Lifetime gross', value: summary.lifetimeGrossAmount },
    { metric: 'Lifetime commission', value: summary.lifetimeCommissionAmount },
    { metric: 'Lifetime net', value: summary.lifetimeNetAmount },
    { metric: 'Lifetime transaction count', value: summary.lifetimeTransactionCount },
  ];

  const cycles: CsvRow[] = summary.cycles.map((cycle) => ({
    cycleLabel: cycle.cycleLabel,
    grossAmount: cycle.grossAmount,
    commissionAmount: cycle.commissionAmount,
    netAmount: cycle.netAmount,
    transactionCount: cycle.transactionCount,
  }));

  const transactionRows: CsvRow[] = transactions.map((transaction) => ({
    date: transaction.createdAt,
    patientName: transaction.patientName,
    fee: transaction.amount.amount,
    status: transaction.status,
  }));

  return { lifetime, cycles, transactions: transactionRows };
}
