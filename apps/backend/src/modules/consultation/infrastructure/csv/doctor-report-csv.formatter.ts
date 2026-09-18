import type { CsvRow } from '../../../reporting/infrastructure/csv/csv-report.formatter.js';
import type { DoctorReportsAnalytics } from '../../application/use-cases/get-doctor-reports-analytics/get-doctor-reports-analytics.use-case.js';

// Doctor Reports page rebuild (Phase 2, decision 4): reuses `CsvRow`/
// `toCsvString` directly from ReportingModule's existing dependency-free
// formatter (apps/backend/.../reporting/infrastructure/csv/csv-report.formatter.ts)
// rather than duplicating its escaping/joining logic -- that file is a pure
// utility with zero NestJS/module dependency (no provider, no DI token), so
// importing it by relative path here is a plain TypeScript import of a pure
// function, not a module-boundary violation (no repository/service of
// ReportingModule is ever reached into). No other module happened to import
// from `reporting/infrastructure/` before this, but the precedent this
// module itself sets elsewhere -- depending on other modules' own exported
// use cases (see consultation.module.ts's own comment) -- is the same
// "consume a published, dependency-free surface" shape.
export interface DoctorReportsCsvSections {
  /** One row per Reports-page tile (decision 1's 7-tile set, plus the Expired footnote and review count). */
  tiles: CsvRow[];
  /** The trend chart's bucketed counts -- a distinct row shape (`bucket`/`count`) from the tiles above, so it is returned as its own section rather than mixed into the same array: `toCsvString` derives its header row from `Object.keys(rows[0])`, so rows of two different shapes in one array would silently truncate to whichever header came first. */
  trend: CsvRow[];
}

/**
 * Pure row-shaping for `GET /appointments/doctor/reports-export` -- mirrors
 * the tile set the Reports page itself renders (plan decision 1) so the
 * exported CSV never disagrees with what the doctor sees on screen.
 */
export function doctorReportsToCsvRows(analytics: DoctorReportsAnalytics): DoctorReportsCsvSections {
  const tiles: CsvRow[] = [
    { metric: 'Total appointments', value: analytics.totalAppointments },
    { metric: 'Completed', value: analytics.completed },
    { metric: 'Cancelled', value: analytics.cancelled },
    { metric: 'No-show', value: analytics.noShow },
    { metric: 'Pending approval', value: analytics.pendingApproval },
    { metric: 'Upcoming', value: analytics.upcoming },
    // Expired has no tile of its own on screen (plan decision 1 -- disclosed
    // as a footnote under Total instead), but is still a real row here: a
    // CSV export has no "footnote" affordance, and this is the one place the
    // reconciliation invariant should stay legible on its own.
    { metric: 'Expired (included in total)', value: analytics.expired },
    { metric: 'Average rating', value: analytics.averageRating ?? '' },
    { metric: 'Review count', value: analytics.reviewCount },
  ];

  const trend: CsvRow[] = analytics.byBucket.map((point) => ({ bucket: point.bucket, count: point.count }));

  return { tiles, trend };
}
