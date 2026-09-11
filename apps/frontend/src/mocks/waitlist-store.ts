import type { JoinWaitlistParams, WaitlistEntry } from '@/features/waitlist/api/types';

/**
 * In-memory mock "backend" state for WaitlistController's routes (N8-Waitlist,
 * ORIVEX Remaining Work Audit) -- mirrors `disputes-store.ts`'s own pattern.
 * Deliberately does NOT simulate the real backend's availability-matching
 * side (an entry here never transitions past 'waiting' on its own -- there
 * is no mock AvailabilityWindow lifecycle to react to), matching this
 * codebase's own disclosed-mock-parity-gap convention (see doctor-store.ts's
 * header comment for the precedent) rather than reimplementing the real
 * matching logic a second time in the mock layer.
 */
const entriesByAccountId = new Map<string, WaitlistEntry[]>();

export function joinWaitlist(callerAccountId: string, params: JoinWaitlistParams): WaitlistEntry {
  const entry: WaitlistEntry = {
    id: `waitlist-${callerAccountId}-${params.doctorId}-${Date.now()}`,
    doctorId: params.doctorId,
    consultationType: params.consultationType ?? null,
    earliestAcceptableAt: params.earliestAcceptableAt,
    latestAcceptableAt: params.latestAcceptableAt,
    status: 'waiting',
    notifiedAt: null,
    fulfilledAt: null,
    cancelledAt: null,
    createdAt: new Date().toISOString(),
  };
  const existing = entriesByAccountId.get(callerAccountId) ?? [];
  entriesByAccountId.set(callerAccountId, [...existing, entry]);
  return entry;
}

export function listWaitlistEntries(callerAccountId: string): WaitlistEntry[] {
  return [...(entriesByAccountId.get(callerAccountId) ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function cancelWaitlistEntry(callerAccountId: string, entryId: string): WaitlistEntry | null {
  const existing = entriesByAccountId.get(callerAccountId) ?? [];
  const index = existing.findIndex((entry) => entry.id === entryId);
  if (index === -1) return null;
  const updated: WaitlistEntry = { ...existing[index]!, status: 'cancelled', cancelledAt: new Date().toISOString() };
  existing[index] = updated;
  entriesByAccountId.set(callerAccountId, existing);
  return updated;
}

/** Test-only reset seam, matching every other mock store's own `resetX()` convention. */
export function resetWaitlistStore(): void {
  entriesByAccountId.clear();
}
