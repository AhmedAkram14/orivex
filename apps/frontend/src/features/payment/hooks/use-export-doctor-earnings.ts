'use client';

import { useCallback, useState } from 'react';
import { paymentApi } from '@/features/payment/api/payment-api';
import { tokenStorage } from '@/shared/auth/token-storage';
import type { DoctorEarningsFilterParams } from '@/features/payment/api/types';

/**
 * Doctor Earnings page rebuild (Phase 3): CSV export for this doctor's own
 * date-ranged earnings (lifetime/cycles/transactions sections). Mirrors
 * `useExportDoctorReports`'s exact mechanism: the export route returns a raw
 * CSV body, not the `{ data, meta }` envelope `apiFetch` unwraps, so this
 * bypasses `apiFetch`, fetches the CSV directly with the bearer token
 * attached by hand, and saves the resulting blob via a synthetic
 * `<a download>` click (no file-saver dependency).
 */
export function useExportDoctorEarnings() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportEarnings = useCallback(async (filter: DoctorEarningsFilterParams = {}) => {
    setIsExporting(true);
    setError(null);
    try {
      const url = paymentApi.buildEarningsExportUrl(filter);
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
      link.download = 'doctor-earnings.csv';
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

  return { exportEarnings, isExporting, error };
}
