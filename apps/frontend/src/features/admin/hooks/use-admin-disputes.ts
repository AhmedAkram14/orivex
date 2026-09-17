'use client';

import { useQueries } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminDisputesKeys } from '@/features/admin/hooks/query-keys';
import type { DisputeCategory } from '@/features/consultation/api/types';

export type AdminDisputeStatusFilter = 'open' | 'resolved' | 'dismissed' | 'withdrawn';

const ALL_STATUSES: AdminDisputeStatusFilter[] = ['open', 'resolved', 'dismissed', 'withdrawn'];

/**
 * I11 -- Admin dispute resolution: the admin queue -- defaults to Open.
 * Dispute System Hardening Phase 3: `status: 'all'` -- the real
 * `GET /admin/disputes` always defaults an omitted status to Open
 * server-side (there is no true "all" query param), so "all" is
 * implemented here as four real per-status requests fanned out with
 * `useQueries` and merged, newest first -- never a fabricated bulk
 * endpoint.
 */
export function useAdminDisputes(status?: AdminDisputeStatusFilter | 'all', category?: DisputeCategory) {
  const isAll = status === 'all';
  const statuses = isAll ? ALL_STATUSES : [status ?? 'open'];

  const queries = useQueries({
    queries: statuses.map((oneStatus) => ({
      queryKey: adminDisputesKeys.list({ status: oneStatus, category }),
      queryFn: () => adminApi.listDisputes(oneStatus, category),
    })),
  });

  const isLoading = queries.some((query) => query.isLoading);
  const isError = queries.some((query) => query.isError);
  const data = isLoading || isError ? undefined : queries.flatMap((query) => query.data ?? []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return { data, isLoading, isError };
}
