import { IsBooleanString, IsISO8601, IsOptional } from 'class-validator';

export interface DoctorReportFilter {
  dateFrom: Date;
  dateTo: Date;
  comparePrevious: boolean;
}

const DEFAULT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// GET /appointments/doctor/reports-analytics's query contract (Doctor
// Reports page rebuild, Phase 1). Both dates are optional -- when both are
// absent, `toFilter()` defaults to the trailing 30 days ending now, matching
// ReportingModule's own `resolveCurrentWindow` default-window convention
// (application/dto/previous-period.ts). When only one of the two is given,
// the other is derived relative to it rather than left as "all time" or
// rejected outright:
//  - dateFrom given, dateTo absent -> dateTo defaults to now.
//  - dateTo given, dateFrom absent -> dateFrom defaults to 30 days before
//    dateTo, i.e. the same trailing-30-day width as the no-date-at-all case.
export class DoctorReportFilterQueryDto {
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @IsBooleanString()
  comparePrevious?: string;

  toFilter(): DoctorReportFilter {
    const parsedFrom = this.dateFrom ? new Date(this.dateFrom) : undefined;
    const parsedTo = this.dateTo ? new Date(this.dateTo) : undefined;

    const dateTo = parsedTo ?? new Date();
    const dateFrom = parsedFrom ?? new Date(dateTo.getTime() - DEFAULT_WINDOW_MS);

    return {
      dateFrom,
      dateTo,
      comparePrevious: this.comparePrevious === 'true',
    };
  }
}
