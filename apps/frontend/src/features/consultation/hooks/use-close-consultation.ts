'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import type { ConsultationCompletionReason } from '@/features/consultation/api/types';
import { consultationSummaryKeys } from '@/features/consultation/hooks/query-keys';
import { doctorQueueKeys } from '@/features/doctor/hooks/query-keys';
import { patientAppointmentsKeys, patientPrescriptionsKeys } from '@/features/patient/hooks/query-keys';
import { notificationKeys } from '@/features/notifications/hooks/query-keys';

/**
 * Consultation lifecycle completion follow-up (2026-07-26): the doctor's
 * explicit "Complete Consultation" action -- distinct from "Leave call"
 * (§3/§4 of the fix's own scope: a disconnect must never be conflated with
 * clinical completion). `POST /consultations/:id/close` was already fully
 * implemented and tested backend-side but had no frontend caller anywhere;
 * this is the first one. Invalidates every surface the real completion
 * transaction affects: the doctor's queue (session leaves "current
 * patient"), the patient's own appointment list/history (status flips to
 * Completed), prescriptions (any signed during the visit become visible),
 * the consultation summary itself, and notifications (the patient gets a
 * "Consultation completed" notification server-side).
 */
export function useCloseConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      consultationSessionId,
      completionReason,
    }: {
      consultationSessionId: string;
      completionReason?: ConsultationCompletionReason;
    }) => consultationApi.close(consultationSessionId, completionReason),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: doctorQueueKeys.all }),
        queryClient.invalidateQueries({ queryKey: patientAppointmentsKeys.all }),
        queryClient.invalidateQueries({ queryKey: patientPrescriptionsKeys.all }),
        queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
        queryClient.invalidateQueries({
          queryKey: consultationSummaryKeys.detail(variables.consultationSessionId),
        }),
      ]);
    },
  });
}
