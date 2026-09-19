import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toCsvString } from '../../../reporting/infrastructure/csv/csv-report.formatter.js';
import type { DoctorEarningsSummary } from '../../application/use-cases/get-doctor-earnings-summary/get-doctor-earnings-summary.use-case.js';
import type { DoctorEarningsTransactionResponseDto } from '../../presentation/dto/doctor-earnings-transaction-response.dto.js';

import { doctorEarningsToCsvRows } from './doctor-earnings-csv.formatter.js';

const BASE_SUMMARY: DoctorEarningsSummary = {
  currency: 'EGP',
  commissionRate: 0.15,
  lifetimeGrossAmount: 1500,
  lifetimeCommissionAmount: 225,
  lifetimeNetAmount: 1275,
  lifetimeTransactionCount: 3,
  cycles: [
    { cycleLabel: '2026-09', grossAmount: 1000, commissionAmount: 150, netAmount: 850, transactionCount: 2 },
    { cycleLabel: '2026-08', grossAmount: 500, commissionAmount: 75, netAmount: 425, transactionCount: 1 },
  ],
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

describe('doctorEarningsToCsvRows', () => {
  it('shapes one lifetime row per metric, from summary.lifetime*, not from cycles', () => {
    const { lifetime } = doctorEarningsToCsvRows(BASE_SUMMARY, []);

    assert.deepEqual(lifetime, [
      { metric: 'Lifetime gross', value: 1500 },
      { metric: 'Lifetime commission', value: 225 },
      { metric: 'Lifetime net', value: 1275 },
      { metric: 'Lifetime transaction count', value: 3 },
    ]);
  });

  it('shapes one cycles row per cycle, distinct shape from lifetime', () => {
    const { cycles } = doctorEarningsToCsvRows(BASE_SUMMARY, []);

    assert.deepEqual(cycles, [
      { cycleLabel: '2026-09', grossAmount: 1000, commissionAmount: 150, netAmount: 850, transactionCount: 2 },
      { cycleLabel: '2026-08', grossAmount: 500, commissionAmount: 75, netAmount: 425, transactionCount: 1 },
    ]);
  });

  it('shapes one transactions row per transaction: date/patientName/fee/status', () => {
    const txn = transaction({});
    const { transactions } = doctorEarningsToCsvRows(BASE_SUMMARY, [txn]);

    assert.deepEqual(transactions, [
      { date: '2026-09-05T00:00:00.000Z', patientName: 'Amina Youssef', fee: 500, status: 'succeeded' },
    ]);
  });

  it('includes a Refunded transaction as a labeled row in `transactions`, without it affecting `lifetime`/`cycles` sums', () => {
    const refunded = transaction({
      id: 'refunded-visit',
      patientName: 'Sara Hassan',
      amount: { amount: 700, currency: 'EGP' },
      status: 'refunded' as DoctorEarningsTransactionResponseDto['status'],
      createdAt: '2026-09-07T00:00:00.000Z',
    });

    const { lifetime, cycles, transactions } = doctorEarningsToCsvRows(BASE_SUMMARY, [refunded]);

    // The Refunded row is present, explicitly labeled.
    assert.equal(transactions.length, 1);
    assert.equal(transactions[0].status, 'refunded');
    assert.equal(transactions[0].fee, 700);

    // `lifetime`/`cycles` are derived purely from the summary (which already
    // excludes non-earned statuses) -- unaffected by what's passed as
    // `transactions`, i.e. the 700 refunded amount is nowhere in these sums.
    assert.deepEqual(lifetime, [
      { metric: 'Lifetime gross', value: 1500 },
      { metric: 'Lifetime commission', value: 225 },
      { metric: 'Lifetime net', value: 1275 },
      { metric: 'Lifetime transaction count', value: 3 },
    ]);
    assert.deepEqual(
      cycles.map((row) => row.grossAmount),
      [1000, 500],
    );
  });

  it('produces valid, parseable CSV text through toCsvString for all three sections', () => {
    const txn = transaction({});
    const { lifetime, cycles, transactions } = doctorEarningsToCsvRows(BASE_SUMMARY, [txn]);
    const csv = [toCsvString(lifetime), toCsvString(cycles), toCsvString(transactions)].join('\n\n');

    const [lifetimeSection, cyclesSection, transactionsSection] = csv.split('\n\n');
    assert.equal(lifetimeSection.split('\n')[0], 'metric,value');
    assert.equal(cyclesSection.split('\n')[0], 'cycleLabel,grossAmount,commissionAmount,netAmount,transactionCount');
    assert.equal(transactionsSection.split('\n')[0], 'date,patientName,fee,status');
    assert.equal(transactionsSection.split('\n')[1], '2026-09-05T00:00:00.000Z,Amina Youssef,500,succeeded');
  });

  it('produces empty CSV sections when there are no cycles/transactions', () => {
    const { cycles, transactions } = doctorEarningsToCsvRows({ ...BASE_SUMMARY, cycles: [] }, []);
    assert.equal(cycles.length, 0);
    assert.equal(transactions.length, 0);
    assert.equal(toCsvString(cycles), '');
    assert.equal(toCsvString(transactions), '');
  });
});
