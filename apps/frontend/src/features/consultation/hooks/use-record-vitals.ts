'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import type { ConsultationSummary } from '@/features/consultation/api/types';
import { consultationSummaryKeys } from '@/features/consultation/hooks/query-keys';
import { doctorPatientChartVitalsKeys } from '@/features/doctor/hooks/query-keys';

export interface RecordVitalsInput {
  weight?: number;
  systolic?: number;
  diastolic?: number;
  bloodSugar?: number;
}

/**
 * The real backend contract (`POST /consultations/:id/vitals`) accepts
 * exactly one reading per request, so a partial or full submit from the
 * Vitals tab fires 1-3 requests in parallel here -- never a fabricated
 * bulk endpoint. On success, invalidates both this session's own summary
 * (so "Today's Vitals" in the dialog updates immediately) and the doctor
 * patient chart's latest-vitals query for this patient (so navigating
 * there afterward shows the new value without a manual refresh, closing
 * the one real gap React Query's 30s default staleTime would otherwise
 * leave).
 */
export function useRecordVitals(consultationSessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordVitalsInput) => {
      const calls: Promise<unknown>[] = [];
      if (input.weight !== undefined) {
        calls.push(consultationApi.recordVital(consultationSessionId, 'weight', input.weight));
      }
      if (input.systolic !== undefined && input.diastolic !== undefined) {
        calls.push(consultationApi.recordVital(consultationSessionId, 'blood-pressure', input.systolic, input.diastolic));
      }
      if (input.bloodSugar !== undefined) {
        calls.push(consultationApi.recordVital(consultationSessionId, 'blood-sugar', input.bloodSugar));
      }
      await Promise.all(calls);
    },
    onSuccess: async () => {
      const cachedSummary = queryClient.getQueryData<ConsultationSummary>(
        consultationSummaryKeys.detail(consultationSessionId),
      );
      await queryClient.invalidateQueries({ queryKey: consultationSummaryKeys.detail(consultationSessionId) });
      const patientId = cachedSummary?.appointment.patientId;
      if (patientId) {
        await queryClient.invalidateQueries({ queryKey: doctorPatientChartVitalsKeys.detail(patientId) });
      }
    },
  });
}
