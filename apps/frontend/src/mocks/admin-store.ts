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
  VerificationCase,
} from '@/features/admin/api/types';

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

function seedVerificationQueue(): VerificationCase[] {
  return [];
}

let accounts: AdminAccount[] = seedAccounts();
let hospitals: Hospital[] = seedHospitals();
let departmentsByHospital: Record<string, Department[]> = seedDepartments();
let verificationQueue: VerificationCase[] = seedVerificationQueue();

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

export function getVerificationQueue(): VerificationCase[] {
  return verificationQueue;
}

export type ReviewVerificationCaseResult = { ok: true; verificationCase: VerificationCase } | { ok: false };

export function reviewVerificationCase(id: string, request: ReviewVerificationCaseRequest): ReviewVerificationCaseResult {
  const existing = verificationQueue.find((c) => c.id === id);
  if (!existing) return { ok: false };
  const updated: VerificationCase = { ...existing, status: request.status, decidedAt: new Date().toISOString() };
  verificationQueue = verificationQueue.map((c) => (c.id === id ? updated : c));
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
  verificationQueue = seedVerificationQueue();
}
