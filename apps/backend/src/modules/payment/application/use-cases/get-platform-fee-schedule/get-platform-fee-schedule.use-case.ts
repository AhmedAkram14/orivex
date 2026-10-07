import { PLATFORM_COMMISSION_RATE } from '../get-doctor-earnings-summary/get-doctor-earnings-summary.use-case.js';

export interface PlatformFeeSchedule {
  /** Share of each consultation fee the platform keeps, 0-1 (0.15 = 15%). The doctor's net is fee x (1 - rate). */
  commissionRate: number;
}

// Public "For Doctors" page (2026-10-06): docs/01-prd.md L189 -- the
// commission is "taken transparently and disclosed to doctors upfront". This
// is the one read of that rate for anyone outside PaymentModule, so the
// recruitment page shows exactly the rate the earnings ledger applies
// (GetDoctorEarningsSummaryUseCase) and can never drift from it.
export class GetPlatformFeeScheduleUseCase {
  execute(): PlatformFeeSchedule {
    return { commissionRate: PLATFORM_COMMISSION_RATE };
  }
}
