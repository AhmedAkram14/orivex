import type { VerificationCase, VerificationCaseStatus, VerificationSubjectType } from '@/features/admin/api/types';

/**
 * Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): the
 * single, generalized in-memory "backend" state for every VerificationCase
 * -- both Doctor and Patient -- mirroring TrustModule's own real
 * `VerificationCaseRepository` (Stage O.2's generalized subject model).
 * `doctor-store.ts`/`patient-store.ts` delegate their own
 * submit/list-verification functions here instead of keeping separate,
 * disconnected arrays, and `admin-store.ts`'s verification-queue functions
 * read/write this exact same array -- so a case a doctor or patient submits
 * through the real (mocked) applicant flow is the same case an admin sees
 * in the queue, and an admin's decision is the same case the applicant's
 * own status view reflects. No application code outside `src/mocks/` may
 * import this directly.
 */
const PENDING_REVIEW_STATUSES: VerificationCaseStatus[] = ['submitted', 'under_review', 'more_info_needed'];

let cases: VerificationCase[] = [];

export interface SubmitVerificationCaseProps {
  subjectAccountId: string;
  subjectType: VerificationSubjectType;
  licenseNumber?: string;
  specialtyCode?: string;
  documentAssetIds: string[];
}

export function submitVerificationCase(props: SubmitVerificationCaseProps): VerificationCase {
  const created: VerificationCase = {
    id: `verification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    subjectAccountId: props.subjectAccountId,
    subjectType: props.subjectType,
    licenseNumber: props.licenseNumber,
    specialtyCode: props.specialtyCode,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    decidedAt: null,
    documentAssetIds: props.documentAssetIds,
  };
  cases = [created, ...cases];
  return created;
}

export function findVerificationCaseById(id: string): VerificationCase | undefined {
  return cases.find((c) => c.id === id);
}

/** Most-recently-submitted-first -- matches the real repository's `findAllBySubject` contract exactly. */
export function findAllVerificationCasesBySubject(subjectType: VerificationSubjectType, subjectAccountId: string): VerificationCase[] {
  return cases.filter((c) => c.subjectType === subjectType && c.subjectAccountId === subjectAccountId);
}

/** Oldest-submitted-first, matching the real repository's `findPendingReview` contract exactly. */
export function findVerificationCasesForQueue(subjectType?: VerificationSubjectType, status?: VerificationCaseStatus): VerificationCase[] {
  const filtered = cases.filter((c) => {
    if (subjectType && c.subjectType !== subjectType) return false;
    if (status) return c.status === status;
    return PENDING_REVIEW_STATUSES.includes(c.status);
  });
  return [...filtered].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}

export type DecidableStatus = Extract<VerificationCaseStatus, 'approved' | 'rejected' | 'more_info_needed'>;

export function decideVerificationCase(id: string, status: DecidableStatus, reason?: string): VerificationCase | undefined {
  const existing = findVerificationCaseById(id);
  if (!existing) return undefined;
  const decidedAt = status === 'approved' || status === 'rejected' ? new Date().toISOString() : existing.decidedAt;
  const updated: VerificationCase = { ...existing, status, reason, decidedAt };
  cases = cases.map((c) => (c.id === id ? updated : c));
  return updated;
}

export function suspendVerificationCase(id: string, reason: string): VerificationCase | undefined {
  const existing = findVerificationCaseById(id);
  if (!existing || existing.status !== 'approved') return undefined;
  const updated: VerificationCase = { ...existing, status: 'suspended', reason };
  cases = cases.map((c) => (c.id === id ? updated : c));
  return updated;
}

/**
 * Test-only: replaces every case belonging to one subject, leaving every
 * other subject's cases (e.g. the other role's own store) completely
 * untouched -- backs `doctor-store.ts`/`patient-store.ts`'s own
 * `reset*Store()`/`setPatientVerified()` seams, each of which must only
 * ever reset its own domain's slice. Never called from application code.
 */
export function setSubjectVerificationCases(
  subjectType: VerificationSubjectType,
  subjectAccountId: string,
  newCases: VerificationCase[],
): void {
  const others = cases.filter((c) => !(c.subjectType === subjectType && c.subjectAccountId === subjectAccountId));
  cases = [...newCases, ...others];
}

/** Test-only: wipes every case, every subject. Never called from application code. */
export function resetVerificationCaseStore(): void {
  cases = [];
}
