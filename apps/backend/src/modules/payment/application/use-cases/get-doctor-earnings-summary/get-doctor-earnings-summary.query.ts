export interface GetDoctorEarningsSummaryQuery {
  doctorId: string;
  // Restricts the cycle breakdown to an arbitrary date range -- omitted
  // means "all cycles this doctor has ever had a transaction in." Lifetime
  // totals are always computed independent of this range (see the use
  // case's own comment for why).
  dateFrom?: Date;
  dateTo?: Date;
}
