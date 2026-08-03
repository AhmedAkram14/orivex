import type { ReportFilter } from '../dto/report-filter.js';

// Average join delay, connection success rate, and missed calls are NOT
// modeled here -- SessionConnectionLog.note is free-text, not structured
// event data, so those three metrics have no real data source (see the
// roadmap completion note's Limitations section). Fabricating them from
// text-parsing would misrepresent real operational data.
export interface TelemedicineAnalyticsResult {
  totalSessions: number;
  completedSessions: number;
  averageDurationMinutes: number | null;
}

export interface TelemedicineAnalyticsQueryPort {
  getAnalytics(filter: ReportFilter): Promise<TelemedicineAnalyticsResult>;
}
