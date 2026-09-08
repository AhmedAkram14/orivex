export interface GetDoctorEarningsSummaryQuery {
  doctorId: string;
  // Restricts the cycle breakdown to a single UTC calendar month
  // (e.g. new Date('2026-09-01')) -- omitted means "all cycles this doctor
  // has ever had a transaction in."
  month?: Date;
}
