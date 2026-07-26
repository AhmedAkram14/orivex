import type {
  AdminAccount,
  CreateDepartmentRequest,
  CreateHospitalRequest,
  Department,
  FeatureFlags,
  Hospital,
  ListAccountsParams,
  PlatformKpis,
  ReviewVerificationCaseRequest,
  SecurityEvent,
  SuspendVerificationCaseRequest,
  VerificationCase,
  VerificationQueueParams,
} from '@/features/admin/api/types';
import {
  decideVerificationCase,
  findAllVerificationCasesBySubject,
  findVerificationCaseById,
  findVerificationCasesForQueue,
  suspendVerificationCase as suspendVerificationCaseInStore,
} from '@/mocks/verification-case-store';

/**
 * In-memory mock "backend" state for `/admin/*` -- mirrors
 * `scheduling-store.ts`'s pattern. Every route is a real backend endpoint
 * (AdministrationModule's AdministrationController, ORIVEX Roadmap 2.0
 * Stage 4); this store exists purely to keep the frontend test suite
 * deterministic.
 */
function seedAccounts(): AdminAccount[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'account-doctor-1',
      email: 'doctor@example.com',
      role: 'doctor',
      status: 'active',
      displayName: 'Dr. Amina Hassan',
      preferredLanguage: 'Arabic',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'account-patient-1',
      email: 'patient@example.com',
      role: 'patient',
      status: 'active',
      displayName: 'Youssef Ibrahim',
      preferredLanguage: 'Arabic',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function seedHospitals(): Hospital[] {
  return [];
}

function seedDepartments(): Record<string, Department[]> {
  return {};
}

let accounts: AdminAccount[] = seedAccounts();
let hospitals: Hospital[] = seedHospitals();
let departmentsByHospital: Record<string, Department[]> = seedDepartments();

export function getPlatformKpis(): PlatformKpis {
  return {
    activeDoctorCount: accounts.filter((a) => a.role === 'doctor' && a.status === 'active').length,
    activePatientCount: accounts.filter((a) => a.role === 'patient' && a.status === 'active').length,
    hospitalCount: hospitals.length,
  };
}

export function listAccounts(params: ListAccountsParams): { accounts: AdminAccount[]; total: number; page: number; limit: number } {
  const page = params.page ?? 1;
  const limit = params.limit ?? 50;
  const filtered = params.role ? accounts.filter((a) => a.role === params.role) : accounts;
  const start = (page - 1) * limit;
  return { accounts: filtered.slice(start, start + limit), total: filtered.length, page, limit };
}

export function updateAccountRole(accountId: string, role: AdminAccount['role']): AdminAccount | undefined {
  accounts = accounts.map((account) => (account.id === accountId ? { ...account, role } : account));
  return accounts.find((account) => account.id === accountId);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature must match adminApi.getSecurityEventsForAccount's real shape
export function getSecurityEventsForAccount(accountId: string): SecurityEvent[] {
  return [];
}

export function listHospitals(): Hospital[] {
  return hospitals;
}

export function createHospital(request: CreateHospitalRequest): Hospital {
  const now = new Date().toISOString();
  const created: Hospital = { id: `hospital-${Date.now()}`, name: request.name, address: request.address, createdAt: now, updatedAt: now };
  hospitals = [...hospitals, created];
  departmentsByHospital[created.id] = [];
  return created;
}

export type ListDepartmentsResult = { ok: true; departments: Department[] } | { ok: false };

export function listDepartments(hospitalId: string): ListDepartmentsResult {
  if (!hospitals.some((hospital) => hospital.id === hospitalId)) return { ok: false };
  return { ok: true, departments: departmentsByHospital[hospitalId] ?? [] };
}

export type CreateDepartmentResult = { ok: true; department: Department } | { ok: false };

export function createDepartment(hospitalId: string, request: CreateDepartmentRequest): CreateDepartmentResult {
  if (!hospitals.some((hospital) => hospital.id === hospitalId)) return { ok: false };
  const created: Department = { id: `department-${Date.now()}`, hospitalId, name: request.name, createdAt: new Date().toISOString() };
  departmentsByHospital[hospitalId] = [...(departmentsByHospital[hospitalId] ?? []), created];
  return { ok: true, department: created };
}

/**
 * Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): the
 * real, server-side subjectType/status filters -- reads the same shared
 * `verification-case-store.ts` a Doctor's or Patient's own submission
 * writes to, so a real (mocked) submission genuinely appears in the admin
 * queue, and an admin's decision genuinely flows back to the applicant's
 * own status view.
 */
export function getVerificationQueue(params: VerificationQueueParams): VerificationCase[] {
  return findVerificationCasesForQueue(params.subjectType, params.status);
}

export function getVerificationCase(id: string): VerificationCase | undefined {
  return findVerificationCaseById(id);
}

// Every past case for the same subject as the named case, most-recently-
// submitted-first -- matches the real GetVerificationHistoryUseCase's own
// contract exactly (resolve the subject, then list all of its cases).
export function getVerificationCaseHistory(id: string): VerificationCase[] {
  const target = findVerificationCaseById(id);
  if (!target) return [];
  return findAllVerificationCasesBySubject(target.subjectType, target.subjectAccountId);
}

export type ReviewVerificationCaseResult = { ok: true; verificationCase: VerificationCase } | { ok: false };

export function reviewVerificationCase(id: string, request: ReviewVerificationCaseRequest): ReviewVerificationCaseResult {
  const updated = decideVerificationCase(id, request.status, request.reason);
  if (!updated) return { ok: false };
  return { ok: true, verificationCase: updated };
}

export type SuspendVerificationCaseResult = { ok: true; verificationCase: VerificationCase } | { ok: false };

export function suspendVerificationCase(id: string, request: SuspendVerificationCaseRequest): SuspendVerificationCaseResult {
  const updated = suspendVerificationCaseInStore(id, request.reason);
  if (!updated) return { ok: false };
  return { ok: true, verificationCase: updated };
}

export function getFeatureFlags(): FeatureFlags {
  return {
    observabilityEnabled: false,
    openApiEnabled: true,
    paymentGatewayConfigured: false,
    telemedicineConfigured: false,
    emailProviderConfigured: false,
    notificationQueueConfigured: false,
  };
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetAdminStore(): void {
  accounts = seedAccounts();
  hospitals = seedHospitals();
  departmentsByHospital = seedDepartments();
  // Verification cases are owned by whichever store originated the
  // submission (doctor-store.ts/patient-store.ts) -- their own
  // reset*Store()/setPatientVerified() already reset their own slice of the
  // shared verification-case-store.ts; this store never seeded any itself.
}
