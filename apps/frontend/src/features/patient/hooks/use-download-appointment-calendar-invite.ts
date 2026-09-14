'use client';

import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@/shared/lib/api/client';
import { env } from '@/shared/lib/env';
import { tokenStorage } from '@/shared/auth/token-storage';

/**
 * K11 -- Calendar sync boundary (ORIVEX Remaining Work Audit): `GET
 * /appointments/:id/calendar.ics` returns a raw `.ics` file, not JSON, so
 * this bypasses `apiFetch` the same way `useDownloadPrescriptionPdf` does
 * for its PDF binary -- a plain authenticated `fetch` with the bearer token
 * read directly from `tokenStorage`. Triggers a real browser download via a
 * short-lived object URL, immediately revoked after the click.
 */
export function useDownloadAppointmentCalendarInvite() {
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const token = tokenStorage.getAccessToken();
      const response = await fetch(`${env.apiBaseUrl}/appointments/${appointmentId}/calendar.ics`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => undefined)) as { error?: { code: string; message: string; requestId: string; timestamp: string } } | undefined;
        if (payload?.error) {
          throw new ApiError(response.status, payload.error);
        }
        throw new Error(`Failed to download the calendar invite (status ${response.status}).`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orivex-appointment-${appointmentId}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
}
