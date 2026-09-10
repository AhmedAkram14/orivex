'use client';

import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@/shared/lib/api/client';
import { env } from '@/shared/lib/env';
import { tokenStorage } from '@/shared/auth/token-storage';

/**
 * I12 -- Prescription digital signature and PDF generation (ORIVEX
 * Remaining Work Audit): `GET /prescriptions/:id/pdf` returns a raw PDF
 * binary, not JSON, so this bypasses `apiFetch` (which always expects a
 * `{ data }` envelope) for a plain authenticated `fetch` -- same bearer
 * token `shared/lib/api/client.ts`'s own header-injection closure reads
 * from, just built directly since a Buffer response has nothing for
 * `apiFetch` to unwrap. Triggers a real browser download via a short-lived
 * object URL, immediately revoked after the click.
 */
export function useDownloadPrescriptionPdf() {
  return useMutation({
    mutationFn: async (prescriptionId: string) => {
      const token = tokenStorage.getAccessToken();
      const response = await fetch(`${env.apiBaseUrl}/prescriptions/${prescriptionId}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => undefined)) as { error?: { code: string; message: string; requestId: string; timestamp: string } } | undefined;
        if (payload?.error) {
          throw new ApiError(response.status, payload.error);
        }
        throw new Error(`Failed to download prescription PDF (status ${response.status}).`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prescription-${prescriptionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
}
