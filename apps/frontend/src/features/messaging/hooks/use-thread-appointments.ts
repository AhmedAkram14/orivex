'use client';

import { useQuery } from '@tanstack/react-query';
import { messagingApi } from '@/features/messaging/api/messaging-api';
import { messageThreadAppointmentsKeys } from '@/features/messaging/hooks/query-keys';
import type { MessageThreadAppointment } from '@/features/messaging/api/types';

/**
 * Thread header context (Phase 5): backs the "Last appointment: {date} ·
 * {status}" line in `thread-panel.tsx`, shown to both roles alike -- both
 * parties benefit from appointment context, not just the doctor (unlike the
 * patient-chart link, which is doctor-only). `GET /message-threads/:id/appointments`
 * (Phase 1) returns every appointment this pair ever had, unordered; this
 * hook picks the most recent by `scheduledAt` client-side rather than
 * assuming the backend's own ordering.
 */
export function useThreadAppointments(threadId: string | undefined) {
  const query = useQuery({
    queryKey: messageThreadAppointmentsKeys.detail(threadId ?? ''),
    queryFn: () => messagingApi.listThreadAppointments(threadId!),
    enabled: Boolean(threadId),
  });

  const lastAppointment = (query.data ?? []).reduce<MessageThreadAppointment | undefined>(
    (latest, appointment) =>
      !latest || new Date(appointment.scheduledAt) > new Date(latest.scheduledAt) ? appointment : latest,
    undefined,
  );

  return { ...query, lastAppointment };
}
