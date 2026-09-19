import { toCsvString } from '../../../../reporting/infrastructure/csv/csv-report.formatter.js';
import { doctorEarningsToCsvRows } from '../../../infrastructure/csv/doctor-earnings-csv.formatter.js';
import type { DoctorEarningsTransactionResponseDto } from '../../../presentation/dto/doctor-earnings-transaction-response.dto.js';
import type { GetDoctorEarningsSummaryUseCase } from '../get-doctor-earnings-summary/get-doctor-earnings-summary.use-case.js';

export interface ExportDoctorEarningsCsvQuery {
  doctorId: string;
  dateFrom: Date;
  dateTo: Date;
  /**
   * Already name-resolved transactions for this doctor/range (plan decision:
   * patient-name resolution stays a presentation-layer concern -- see
   * DoctorEarningsTransactionResponseDto's own comment -- so this use case
   * does NOT call GetDoctorEarningsTransactionsUseCase or reach into
   * Patient/Identity itself). The controller resolves these the same way it
   * already does for `GET payments/doctor/earnings-transactions` and passes
   * the result straight through here, so there is exactly one name-
   * resolution code path, not two.
   */
  transactionsWithNames: DoctorEarningsTransactionResponseDto[];
}

// Doctor Earnings page rebuild (Phase 2): CSV export composing the same
// GetDoctorEarningsSummaryUseCase the JSON summary route already uses -- no
// separate re-aggregation. Transactions are supplied by the caller already
// name-resolved (see ExportDoctorEarningsCsvQuery's own comment) rather than
// this use case calling GetDoctorEarningsTransactionsUseCase itself, since
// that use case returns raw domain entities with no patient name attached.
// Three `toCsvString` sections (lifetime, cycles, transactions),
// blank-line-separated, mirroring ExportDoctorReportsCsvUseCase's exact join
// pattern -- the three row shapes don't share one header (see
// doctor-earnings-csv.formatter.ts's own comment).
export class ExportDoctorEarningsCsvUseCase {
  constructor(private readonly getDoctorEarningsSummaryUseCase: GetDoctorEarningsSummaryUseCase) {}

  async execute(query: ExportDoctorEarningsCsvQuery): Promise<string> {
    const summary = await this.getDoctorEarningsSummaryUseCase.execute({
      doctorId: query.doctorId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
    const { lifetime, cycles, transactions } = doctorEarningsToCsvRows(summary, query.transactionsWithNames);

    const sections = [toCsvString(lifetime)];
    if (cycles.length > 0) {
      sections.push(toCsvString(cycles));
    }
    if (transactions.length > 0) {
      sections.push(toCsvString(transactions));
    }
    return sections.join('\n\n');
  }
}
