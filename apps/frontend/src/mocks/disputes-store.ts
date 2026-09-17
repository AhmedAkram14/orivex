import type { Dispute, DisputeCategory } from '@/features/consultation/api/types';

/**
 * In-memory mock "backend" state for DisputeController/AdministrationController's
 * dispute routes (I11, ORIVEX Remaining Work Audit) -- mirrors
 * `messaging-store.ts`'s own pattern. One dispute per appointment id.
 *
 * Dispute System Hardening: keeps `category`/`attachmentAssetId` and the new
 * `Withdrawn` status. Visibility here stays raiser-scoped (this mock layer's
 * own known, documented limitation -- it has no appointment-party lookup to
 * resolve a real counterparty from, unlike the real backend's `listForParty`
 * join query) -- see this store's own `listDisputesForAccount` comment.
 */
const disputesByAppointmentId = new Map<string, Dispute>();

export function raiseDispute(
  appointmentId: string,
  callerAccountId: string,
  reason: string,
  category: DisputeCategory,
  attachmentAssetId?: string,
): { ok: true; dispute: Dispute } | { ok: false; reason: 'conflict' } {
  if (disputesByAppointmentId.has(appointmentId)) {
    return { ok: false, reason: 'conflict' };
  }
  const dispute: Dispute = {
    id: `dispute-${appointmentId}`,
    appointmentId,
    raisedByAccountId: callerAccountId,
    reason,
    category,
    attachmentAssetId: attachmentAssetId ?? null,
    status: 'open',
    resolutionNotes: null,
    resolvedByAccountId: null,
    resolvedAt: null,
    createdAt: new Date().toISOString(),
  };
  disputesByAppointmentId.set(appointmentId, dispute);
  return { ok: true, dispute };
}

// Mock-layer limitation (documented above): raiser-scoped only, not the real
// backend's bidirectional (raiser OR counterparty) visibility -- this store
// has no appointment/patient/doctor join to resolve a counterparty from.
export function listDisputesForAccount(callerAccountId: string): Dispute[] {
  return Array.from(disputesByAppointmentId.values()).filter((dispute) => dispute.raisedByAccountId === callerAccountId);
}

export function listDisputesByStatus(status: Dispute['status'], category?: DisputeCategory): Dispute[] {
  return Array.from(disputesByAppointmentId.values()).filter(
    (dispute) => dispute.status === status && (!category || dispute.category === category),
  );
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

/** Dispute System Hardening Phase 1: the raiser's own retraction, matching `PATCH /disputes/:id/withdraw`'s 404-not-403 convention -- returns null for a missing dispute, a non-raiser caller, or one that's no longer Open. */
export function withdrawDispute(disputeId: string, callerAccountId: string): Dispute | null {
  const existing = Array.from(disputesByAppointmentId.values()).find((dispute) => dispute.id === disputeId);
  if (!existing || existing.status !== 'open' || existing.raisedByAccountId !== callerAccountId) return null;
  const updated: Dispute = { ...existing, status: 'withdrawn' };
  disputesByAppointmentId.set(existing.appointmentId, updated);
  return updated;
}

/** Test-only reset seam, matching every other mock store's own `resetX()` convention. */
export function resetDisputesStore(): void {
  disputesByAppointmentId.clear();
}
