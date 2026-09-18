'use client';

import { useCallback, useState } from 'react';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { tokenStorage } from '@/shared/auth/token-storage';

export interface DoctorReportsExportFilter {
  dateFrom?: string;
  dateTo?: string;
  comparePrevious?: boolean;
}

/**
 * Doctor Reports page rebuild (Phase 2): CSV export for this doctor's own
 * date-ranged reports analytics. A small dedicated hook -- not a
 * generalization of `useExportReport` (admin ReportingModule's own hook,
 * parameterized on admin-only `ReportSection`/`ReportFilterParams`) -- but it
 * mirrors that hook's exact mechanism: the export route returns a raw CSV
 * body, not the `{ data, meta }` envelope `apiFetch` unwraps, so this
 * bypasses `apiFetch`, fetches the CSV directly with the bearer token
 * attached by hand, and saves the resulting blob via a synthetic
 * `<a download>` click (no file-saver dependency, matching the "CSV now,
 * zero new dependency" decision).
 */
export function useExportDoctorReports() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportReports = useCallback(async (filter: DoctorReportsExportFilter = {}) => {
    setIsExporting(true);
    setError(null);
    try {
      const url = doctorApi.buildReportsExportUrl(filter);
      const token = tokenStorage.getAccessToken();
      const response = await fetch(url, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}.`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'doctor-reports.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error('Export failed.'));
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportReports, isExporting, error };
}
