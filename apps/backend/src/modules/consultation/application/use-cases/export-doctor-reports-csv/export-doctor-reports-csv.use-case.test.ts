import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  DoctorReportsAnalytics,
  GetDoctorReportsAnalyticsQuery,
  GetDoctorReportsAnalyticsUseCase,
} from '../get-doctor-reports-analytics/get-doctor-reports-analytics.use-case.js';

import { ExportDoctorReportsCsvUseCase } from './export-doctor-reports-csv.use-case.js';

const ANALYTICS: DoctorReportsAnalytics = {
  totalAppointments: 10,
  completed: 6,
  cancelled: 1,
  noShow: 1,
  pendingApproval: 1,
  upcoming: 1,
  expired: 0,
  averageRating: 4.8,
  reviewCount: 6,
  byBucket: [{ bucket: '2026-01-01', count: 10 }],
};

class FakeGetDoctorReportsAnalyticsUseCase implements Pick<GetDoctorReportsAnalyticsUseCase, 'execute'> {
  public lastQuery: GetDoctorReportsAnalyticsQuery | undefined;
  constructor(private readonly result: DoctorReportsAnalytics) {}
  async execute(query: GetDoctorReportsAnalyticsQuery): Promise<DoctorReportsAnalytics> {
    this.lastQuery = query;
    return this.result;
  }
}

describe('ExportDoctorReportsCsvUseCase', () => {
  it('forwards the query straight through to GetDoctorReportsAnalyticsUseCase, unmodified', async () => {
    const analyticsUseCase = new FakeGetDoctorReportsAnalyticsUseCase(ANALYTICS);
    const useCase = new ExportDoctorReportsCsvUseCase(analyticsUseCase as unknown as GetDoctorReportsAnalyticsUseCase);

    const query: GetDoctorReportsAnalyticsQuery = {
      doctorId: 'doctor-1',
      dateFrom: new Date('2026-01-01T00:00:00Z'),
      dateTo: new Date('2026-01-31T00:00:00Z'),
      comparePrevious: true,
    };
    await useCase.execute(query);

    assert.deepEqual(analyticsUseCase.lastQuery, query);
  });

  it('returns real CSV text with the tile section then a blank-line-separated trend section', async () => {
    const analyticsUseCase = new FakeGetDoctorReportsAnalyticsUseCase(ANALYTICS);
    const useCase = new ExportDoctorReportsCsvUseCase(analyticsUseCase as unknown as GetDoctorReportsAnalyticsUseCase);

    const csv = await useCase.execute({
      doctorId: 'doctor-1',
      dateFrom: new Date('2026-01-01T00:00:00Z'),
      dateTo: new Date('2026-01-31T00:00:00Z'),
    });

    const [tileSection, trendSection] = csv.split('\n\n');
    assert.match(tileSection, /^metric,value/);
    assert.match(tileSection, /Total appointments,10/);
    assert.match(tileSection, /Completed,6/);
    assert.match(trendSection, /^bucket,count/);
    assert.match(trendSection, /2026-01-01,10/);
  });

  it('omits the trend section (no trailing blank-line separator) when byBucket is empty', async () => {
    const analyticsUseCase = new FakeGetDoctorReportsAnalyticsUseCase({ ...ANALYTICS, byBucket: [] });
    const useCase = new ExportDoctorReportsCsvUseCase(analyticsUseCase as unknown as GetDoctorReportsAnalyticsUseCase);

    const csv = await useCase.execute({
      doctorId: 'doctor-1',
      dateFrom: new Date('2026-01-01T00:00:00Z'),
      dateTo: new Date('2026-01-31T00:00:00Z'),
    });

    assert.ok(!csv.includes('\n\n'));
    assert.ok(!csv.includes('bucket,count'));
  });
});
