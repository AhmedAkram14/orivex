'use client';

import { useCallback, useState } from 'react';
import { reportingApi } from '@/features/reporting/api/reporting-api';
import type { ReportFilterParams, ReportSection } from '@/features/reporting/api/types';
import { tokenStorage } from '@/shared/auth/token-storage';

/**
 * CSV export -- not a TanStack Query hook (this triggers a file download as
 * a side effect, it doesn't cache a value). Fetches the CSV body directly
 * (bypassing `apiFetch`, which assumes the `{ data, meta }` JSON envelope
 * every other endpoint returns) and saves it via a synthetic `<a download>`
 * click, matching the "CSV now, zero new dependency" decision -- no file-
 * saver library.
 */
export function useExportReport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportReport = useCallback(async (section: ReportSection, filter: ReportFilterParams) => {
    setIsExporting(true);
    setError(null);
    try {
      const url = reportingApi.buildExportUrl(section, filter);
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
      link.download = `${section}-report.csv`;
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

  return { exportReport, isExporting, error };
}
