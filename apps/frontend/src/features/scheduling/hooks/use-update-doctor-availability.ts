'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/features/scheduling/api/scheduling-api';
import { doctorAvailabilityKeys } from '@/features/scheduling/hooks/query-keys';
import type { RecurringWeeklySchedule } from '@/features/scheduling/types';

export function useUpdateDoctorAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (schedule: RecurringWeeklySchedule) => schedulingApi.updateDoctorAvailability(schedule),
    onSuccess: (schedule) => {
      queryClient.setQueryData(doctorAvailabilityKeys.detail('current'), schedule);
    },
  });
}
