// Shared filter shape across every analytics use case. Every field is
// optional — an empty filter means "the whole platform, all time." Dates are
// plain JS Date, already parsed by the presentation-layer query DTO before
// reaching here (application layer never parses raw query strings).
export interface ReportFilter {
  dateFrom?: Date;
  dateTo?: Date;
  doctorId?: string;
  specialtyId?: string;
  consultationType?: string;
  paymentStatus?: string;
  verificationStatus?: string;
}

// Every "top N over a period" and "this period vs a comparison baseline"
// query shares this: reporting/domain/date-range.ts computes the prior
// period of equal length immediately preceding dateFrom when comparePrevious
// is set, and the use case returns both bucket sets side by side rather than
// the presentation layer re-deriving it.
export interface ReportFilterWithCompare extends ReportFilter {
  comparePrevious?: boolean;
}
