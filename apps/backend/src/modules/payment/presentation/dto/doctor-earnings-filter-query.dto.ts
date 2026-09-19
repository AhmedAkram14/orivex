import { IsISO8601, IsOptional } from 'class-validator';

export interface DoctorEarningsFilter {
  dateFrom: Date;
  dateTo: Date;
}

// Duplicated rather than importing ConsultationModule's
// DoctorReportFilterQueryDto -- this module's own established convention is
// no cross-module DTO imports (see Phase 0's findings from the Doctor
// Reports rebuild). `comparePrevious` is intentionally omitted: Earnings has
// no previous-period comparison feature.
const DEFAULT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// GET /payments/doctor/earnings-summary and GET
// /payments/doctor/earnings-transactions's shared query contract (Doctor
// Earnings page rebuild, Phase 1). Both dates are optional -- when both are
// absent, `toFilter()` defaults to the trailing 30 days ending now, mirroring
// DoctorReportFilterQueryDto's exact default-window logic:
//  - dateFrom given, dateTo absent -> dateTo defaults to now.
//  - dateTo given, dateFrom absent -> dateFrom defaults to 30 days before
//    dateTo, i.e. the same trailing-30-day width as the no-date-at-all case.
export class DoctorEarningsFilterQueryDto {
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  toFilter(): DoctorEarningsFilter {
    const parsedFrom = this.dateFrom ? new Date(this.dateFrom) : undefined;
    const parsedTo = this.dateTo ? new Date(this.dateTo) : undefined;

    const dateTo = parsedTo ?? new Date();
    const dateFrom = parsedFrom ?? new Date(dateTo.getTime() - DEFAULT_WINDOW_MS);

    return { dateFrom, dateTo };
  }
}
