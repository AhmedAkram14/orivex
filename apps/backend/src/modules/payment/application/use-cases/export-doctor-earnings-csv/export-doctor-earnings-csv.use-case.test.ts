import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  DoctorEarningsSummary,
  GetDoctorEarningsSummaryUseCase,
} from '../get-doctor-earnings-summary/get-doctor-earnings-summary.use-case.js';
import type { GetDoctorEarningsSummaryQuery } from '../get-doctor-earnings-summary/get-doctor-earnings-summary.query.js';
import type { DoctorEarningsTransactionResponseDto } from '../../../presentation/dto/doctor-earnings-transaction-response.dto.js';

import { ExportDoctorEarningsCsvUseCase } from './export-doctor-earnings-csv.use-case.js';

const SUMMARY: DoctorEarningsSummary = {
  currency: 'EGP',
  commissionRate: 0.15,
  lifetimeGrossAmount: 1500,
  lifetimeCommissionAmount: 225,
  lifetimeNetAmount: 1275,
  lifetimeTransactionCount: 3,
  cycles: [{ cycleLabel: '2026-09', grossAmount: 500, commissionAmount: 75, netAmount: 425, transactionCount: 1 }],
};

function transaction(overrides: Partial<DoctorEarningsTransactionResponseDto>): DoctorEarningsTransactionResponseDto {
  return {
    id: 'txn-1',
    appointmentId: 'appointment-1',
    consultationSessionId: 'session-1',
    patientId: 'patient-1',
    patientName: 'Amina Youssef',
    amount: { amount: 500, currency: 'EGP' },
    status: 'succeeded' as DoctorEarningsTransactionResponseDto['status'],
    createdAt: '2026-09-05T00:00:00.000Z',
    ...overrides,
  };
}

class FakeGetDoctorEarningsSummaryUseCase implements Pick<GetDoctorEarningsSummaryUseCase, 'execute'> {
  public lastQuery: GetDoctorEarningsSummaryQuery | undefined;
  constructor(private readonly result: DoctorEarningsSummary) {}
  async execute(query: GetDoctorEarningsSummaryQuery): Promise<DoctorEarningsSummary> {
    this.lastQuery = query;
    return this.result;
  }
}

describe('ExportDoctorEarningsCsvUseCase', () => {
  it('forwards doctorId/dateFrom/dateTo straight through to GetDoctorEarningsSummaryUseCase, unmodified', async () => {
    const summaryUseCase = new FakeGetDoctorEarningsSummaryUseCase(SUMMARY);
    const useCase = new ExportDoctorEarningsCsvUseCase(summaryUseCase as unknown as GetDoctorEarningsSummaryUseCase);

    const dateFrom = new Date('2026-09-01T00:00:00Z');
    const dateTo = new Date('2026-10-01T00:00:00Z');
    await useCase.execute({ doctorId: 'doctor-1', dateFrom, dateTo, transactionsWithNames: [] });

    assert.deepEqual(summaryUseCase.lastQuery, { doctorId: 'doctor-1', dateFrom, dateTo });
  });

  it('does not re-derive transactions itself -- uses exactly the transactionsWithNames passed in', async () => {
    const summaryUseCase = new FakeGetDoctorEarningsSummaryUseCase(SUMMARY);
    const useCase = new ExportDoctorEarningsCsvUseCase(summaryUseCase as unknown as GetDoctorEarningsSummaryUseCase);

    const txn = transaction({ patientName: 'Sara Hassan' });
    const csv = await useCase.execute({
      doctorId: 'doctor-1',
      dateFrom: new Date('2026-09-01T00:00:00Z'),
      dateTo: new Date('2026-10-01T00:00:00Z'),
      transactionsWithNames: [txn],
    });

    assert.match(csv, /Sara Hassan/);
  });

  it('returns real CSV text with lifetime, then cycles, then transactions sections, blank-line-separated', async () => {
    const summaryUseCase = new FakeGetDoctorEarningsSummaryUseCase(SUMMARY);
    const useCase = new ExportDoctorEarningsCsvUseCase(summaryUseCase as unknown as GetDoctorEarningsSummaryUseCase);

    const csv = await useCase.execute({
      doctorId: 'doctor-1',
      dateFrom: new Date('2026-09-01T00:00:00Z'),
      dateTo: new Date('2026-10-01T00:00:00Z'),
      transactionsWithNames: [transaction({})],
    });

    const [lifetimeSection, cyclesSection, transactionsSection] = csv.split('\n\n');
    assert.match(lifetimeSection, /^metric,value/);
    assert.match(lifetimeSection, /Lifetime gross,1500/);
    assert.match(cyclesSection, /^cycleLabel,grossAmount/);
    assert.match(cyclesSection, /2026-09,500/);
    assert.match(transactionsSection, /^date,patientName,fee,status/);
    assert.match(transactionsSection, /Amina Youssef,500,succeeded/);
  });

  it('omits the cycles/transactions sections (no trailing blank-line separators) when both are empty', async () => {
    const summaryUseCase = new FakeGetDoctorEarningsSummaryUseCase({ ...SUMMARY, cycles: [] });
    const useCase = new ExportDoctorEarningsCsvUseCase(summaryUseCase as unknown as GetDoctorEarningsSummaryUseCase);

    const csv = await useCase.execute({
      doctorId: 'doctor-1',
      dateFrom: new Date('2026-09-01T00:00:00Z'),
      dateTo: new Date('2026-10-01T00:00:00Z'),
      transactionsWithNames: [],
    });

    assert.ok(!csv.includes('\n\n'));
    assert.ok(!csv.includes('cycleLabel'));
    assert.ok(!csv.includes('patientName'));
  });
});
