'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import type { ConsultationSummary, SignPrescriptionLineItemInput } from '@/features/consultation/api/types';
import { consultationSummaryKeys } from '@/features/consultation/hooks/query-keys';
import { doctorPatientChartPrescriptionsKeys } from '@/features/doctor/hooks/query-keys';

export interface SignPrescriptionInput {
  diagnosisNodeId: string;
  /**
   * Phase 3 (Prescribing & Allergy Safety UX): a real array, matching
   * `SignPrescriptionRequestDto.lineItems[]` exactly (Phase 0 finding (d) --
   * the backend already supports multiple medications per prescription).
   * One or more line items sign as one `Prescription`.
   */
  lineItems: SignPrescriptionLineItemInput[];
}

/**
 * Doctor prescription authoring (ORIVEX Remaining Work Audit, P0 C4): the
 * write side of the Prescriptions tab, mirroring `useRecordVitals`'s exact
 * invalidation shape -- this session's own summary (so the newly-signed
 * prescription appears immediately) plus the doctor patient chart's
 * prescriptions query for this patient (so navigating there afterward shows
 * it without a manual refresh).
 */
export function useSignPrescription(consultationSessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diagnosisNodeId, lineItems }: SignPrescriptionInput) =>
      consultationApi.signPrescription(consultationSessionId, diagnosisNodeId, lineItems),
    onSuccess: async () => {
      const cachedSummary = queryClient.getQueryData<ConsultationSummary>(
        consultationSummaryKeys.detail(consultationSessionId),
      );
      await queryClient.invalidateQueries({ queryKey: consultationSummaryKeys.detail(consultationSessionId) });
      const patientId = cachedSummary?.appointment.patientId;
      if (patientId) {
        await queryClient.invalidateQueries({ queryKey: doctorPatientChartPrescriptionsKeys.detail(patientId) });
      }
    },
  });
}
