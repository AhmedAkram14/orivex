import type { Dispute } from '@/features/consultation/api/types';

/**
 * In-memory mock "backend" state for DisputeController/AdministrationController's
 * dispute routes (I11, ORIVEX Remaining Work Audit) -- mirrors
 * `messaging-store.ts`'s own pattern. One dispute per appointment id.
 */
const disputesByAppointmentId = new Map<string, Dispute>();

export function raiseDispute(appointmentId: string, callerAccountId: string, reason: string): { ok: true; dispute: Dispute } | { ok: false; reason: 'conflict' } {
  if (disputesByAppointmentId.has(appointmentId)) {
    return { ok: false, reason: 'conflict' };
  }
  const dispute: Dispute = {
    id: `dispute-${appointmentId}`,
    appointmentId,
    raisedByAccountId: callerAccountId,
    reason,
    status: 'open',
    resolutionNotes: null,
    resolvedByAccountId: null,
    resolvedAt: null,
    createdAt: new Date().toISOString(),
  };
  disputesByAppointmentId.set(appointmentId, dispute);
  return { ok: true, dispute };
}

export function listDisputesForAccount(callerAccountId: string): Dispute[] {
  return Array.from(disputesByAppointmentId.values()).filter((dispute) => dispute.raisedByAccountId === callerAccountId);
}

export function listDisputesByStatus(status: 'open' | 'resolved' | 'dismissed'): Dispute[] {
  return Array.from(disputesByAppointmentId.values()).filter((dispute) => dispute.status === status);
}

export function resolveDispute(
  disputeId: string,
  status: 'resolved' | 'dismissed',
  resolutionNotes: string,
  resolverAccountId: string,
): Dispute | null {
  const existing = Array.from(disputesByAppointmentId.values()).find((dispute) => dispute.id === disputeId);
  if (!existing || existing.status !== 'open') return null;
  const updated: Dispute = {
    ...existing,
    status,
    resolutionNotes,
    resolvedByAccountId: resolverAccountId,
    resolvedAt: new Date().toISOString(),
  };
  disputesByAppointmentId.set(existing.appointmentId, updated);
  return updated;
}

/** Test-only reset seam, matching every other mock store's own `resetX()` convention. */
export function resetDisputesStore(): void {
  disputesByAppointmentId.clear();
}
