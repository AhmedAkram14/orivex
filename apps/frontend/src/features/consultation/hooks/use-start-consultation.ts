'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import { doctorQueueKeys } from '@/features/doctor/hooks/query-keys';

/**
 * Product follow-up (2026-07-26): the Doctor Queue's real "Start
 * consultation" action — `POST /consultations/:id/start` was already fully
 * implemented backend-side (StartConsultationUseCase, moves a session
 * WaitingRoom -> InProgress) but had no frontend caller anywhere, so a
 * doctor could never actually begin a consultation with a waiting patient.
 * Invalidates the queue on success so the entry moves into the "current
 * patient" slot (`CurrentPatientCard`), which is what makes the doctor's
 * own `JoinCallAction` appear.
 */
export function useStartConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (consultationSessionId: string) => consultationApi.start(consultationSessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: doctorQueueKeys.list() });
    },
  });
}
