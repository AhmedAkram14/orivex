import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useExportDoctorReports } from './use-export-doctor-reports';

describe('useExportDoctorReports', () => {
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clickSpy = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickSpy);
    // jsdom's URL doesn't implement the Blob-URL statics -- add them
    // directly onto the real class rather than replacing the global
    // (replacing it entirely breaks env.ts's zod `.url()` validation, which
    // calls `new URL(...)` internally). Mirrors `use-export-report.test.tsx`'s
    // own precedent exactly.
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads the CSV blob and triggers a synthetic click when the export succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['metric,value\nTotal appointments,10'])) }),
    );
    const { result } = renderHook(() => useExportDoctorReports());

    await act(async () => {
      await result.current.exportReports({ dateFrom: '2026-01-01', dateTo: '2026-01-31' });
    });

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.isExporting).toBe(false);
  });

  it('surfaces an error and never clicks the download link when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const { result } = renderHook(() => useExportDoctorReports());

    await act(async () => {
      await result.current.exportReports({});
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
