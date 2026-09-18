import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toCsvString } from '../../../reporting/infrastructure/csv/csv-report.formatter.js';
import type { DoctorReportsAnalytics } from '../../application/use-cases/get-doctor-reports-analytics/get-doctor-reports-analytics.use-case.js';

import { doctorReportsToCsvRows } from './doctor-report-csv.formatter.js';

const BASE_ANALYTICS: DoctorReportsAnalytics = {
  totalAppointments: 26,
  completed: 10,
  cancelled: 3,
  noShow: 2,
  pendingApproval: 2,
  upcoming: 8,
  expired: 1,
  averageRating: 4.5,
  reviewCount: 12,
  byBucket: [
    { bucket: '2026-01-01', count: 3 },
    { bucket: '2026-01-02', count: 5 },
  ],
};

describe('doctorReportsToCsvRows', () => {
  it('shapes one tile row per Reports-page tile, plus the Expired footnote and review count', () => {
    const { tiles } = doctorReportsToCsvRows(BASE_ANALYTICS);

    assert.deepEqual(tiles, [
      { metric: 'Total appointments', value: 26 },
      { metric: 'Completed', value: 10 },
      { metric: 'Cancelled', value: 3 },
      { metric: 'No-show', value: 2 },
      { metric: 'Pending approval', value: 2 },
      { metric: 'Upcoming', value: 8 },
      { metric: 'Expired (included in total)', value: 1 },
      { metric: 'Average rating', value: 4.5 },
      { metric: 'Review count', value: 12 },
    ]);
  });

  it('shapes the byBucket trend into its own section, distinct from the tile rows', () => {
    const { trend } = doctorReportsToCsvRows(BASE_ANALYTICS);

    assert.deepEqual(trend, [
      { bucket: '2026-01-01', count: 3 },
      { bucket: '2026-01-02', count: 5 },
    ]);
  });

  it('renders a null average rating as an empty CSV cell, not the literal string "null"', () => {
    const { tiles } = doctorReportsToCsvRows({ ...BASE_ANALYTICS, averageRating: null, reviewCount: 0 });
    const ratingRow = tiles.find((row) => row.metric === 'Average rating');
    assert.equal(ratingRow?.value, '');

    const csv = toCsvString(tiles);
    assert.ok(csv.includes('Average rating,\n') || csv.endsWith('Average rating,'));
  });

  it('produces valid, parseable CSV text when passed through toCsvString', () => {
    const { tiles, trend } = doctorReportsToCsvRows(BASE_ANALYTICS);
    const csv = [toCsvString(tiles), toCsvString(trend)].join('\n\n');

    const [tileSection, trendSection] = csv.split('\n\n');
    const tileLines = tileSection.split('\n');
    assert.equal(tileLines[0], 'metric,value');
    assert.equal(tileLines[1], 'Total appointments,26');
    assert.equal(tileLines.length, tiles.length + 1);

    const trendLines = trendSection.split('\n');
    assert.equal(trendLines[0], 'bucket,count');
    assert.equal(trendLines[1], '2026-01-01,3');
    assert.equal(trendLines.length, trend.length + 1);
  });

  it('omits the trend section entirely when byBucket is empty', () => {
    const { trend } = doctorReportsToCsvRows({ ...BASE_ANALYTICS, byBucket: [] });
    assert.equal(trend.length, 0);
    assert.equal(toCsvString(trend), '');
  });
});
