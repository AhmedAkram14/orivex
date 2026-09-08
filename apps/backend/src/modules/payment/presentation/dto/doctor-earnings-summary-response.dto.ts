import type { DoctorEarningsCycle, DoctorEarningsSummary } from '../../application/use-cases/get-doctor-earnings-summary/get-doctor-earnings-summary.use-case.js';

export class DoctorEarningsCycleDto {
  cycleLabel!: string;
  grossAmount!: number;
  commissionAmount!: number;
  netAmount!: number;
  transactionCount!: number;

  static fromResult(cycle: DoctorEarningsCycle): DoctorEarningsCycleDto {
    const dto = new DoctorEarningsCycleDto();
    dto.cycleLabel = cycle.cycleLabel;
    dto.grossAmount = cycle.grossAmount;
    dto.commissionAmount = cycle.commissionAmount;
    dto.netAmount = cycle.netAmount;
    dto.transactionCount = cycle.transactionCount;
    return dto;
  }
}

// I2 -- Doctor earnings. `currency` is null only when the doctor has zero
// earned transactions yet -- an honest empty state, not a fabricated "EGP".
export class DoctorEarningsSummaryResponseDto {
  currency!: string | null;
  commissionRate!: number;
  lifetimeGrossAmount!: number;
  lifetimeCommissionAmount!: number;
  lifetimeNetAmount!: number;
  lifetimeTransactionCount!: number;
  cycles!: DoctorEarningsCycleDto[];

  static fromResult(result: DoctorEarningsSummary): DoctorEarningsSummaryResponseDto {
    const dto = new DoctorEarningsSummaryResponseDto();
    dto.currency = result.currency;
    dto.commissionRate = result.commissionRate;
    dto.lifetimeGrossAmount = result.lifetimeGrossAmount;
    dto.lifetimeCommissionAmount = result.lifetimeCommissionAmount;
    dto.lifetimeNetAmount = result.lifetimeNetAmount;
    dto.lifetimeTransactionCount = result.lifetimeTransactionCount;
    dto.cycles = result.cycles.map((cycle) => DoctorEarningsCycleDto.fromResult(cycle));
    return dto;
  }
}
