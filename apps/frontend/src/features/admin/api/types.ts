import type { Role } from '@/shared/auth/types';

/** Matches AdministrationModule's real PlatformKpisResponseDto exactly. */
export interface PlatformKpis {
  activeDoctorCount: number;
  activePatientCount: number;
  hospitalCount: number;
}

export type AccountStatus = 'active' | 'suspended' | 'closed';

/** Matches IdentityModule's real AccountResponseDto exactly. */
export interface AdminAccount {
  id: string;
  email: string;
  role: Role;
  status: AccountStatus;
  displayName: string;
  phoneNumber?: string;
  preferredLanguage: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListAccountsResult {
  accounts: AdminAccount[];
  total: number;
  page: number;
  limit: number;
}

export interface ListAccountsParams {
  page?: number;
  limit?: number;
  role?: Role;
}

/** Matches AdministrationModule's real HospitalResponseDto exactly. */
export interface Hospital {
  id: string;
  name: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHospitalRequest {
  name: string;
  address?: string;
}

/** Matches AdministrationModule's real DepartmentResponseDto exactly. */
export interface Department {
  id: string;
  hospitalId: string;
  name: string;
  createdAt: string;
}

export interface CreateDepartmentRequest {
  name: string;
}

export type VerificationCaseStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'more_info_needed'
  | 're_verification_due'
  | 'suspended';

export type VerificationSubjectType = 'doctor' | 'patient';

/**
 * Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8):
 * matches AdministrationModule's real AdminVerificationCaseResponseDto
 * exactly (Stage O.2's subjectAccountId/subjectType generalization -- the
 * stale pre-O.2 `doctorId` field this replaces never matched the real
 * backend response and was never populated in production). `documentAssetIds`
 * is admin-only -- never returned by the applicant-facing status endpoints.
 */
export interface VerificationCase {
  id: string;
  subjectAccountId: string;
  subjectType: VerificationSubjectType;
  licenseNumber?: string;
  specialtyCode?: string;
  status: VerificationCaseStatus;
  reason?: string;
  submittedAt: string;
  decidedAt: string | null;
  documentAssetIds: string[];
}

export type VerificationDecisionStatus = 'approved' | 'rejected' | 'more_info_needed';

export interface ReviewVerificationCaseRequest {
  status: VerificationDecisionStatus;
  reason?: string;
}

export interface SuspendVerificationCaseRequest {
  reason: string;
}

export interface VerificationQueueParams {
  subjectType?: VerificationSubjectType;
  status?: VerificationCaseStatus;
}

/** Matches AdministrationModule's real SecurityEventResponseDto exactly. */
export interface SecurityEvent {
  id: string;
  accountId: string;
  eventType: string;
  status: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
  detectedAt: string;
}

/** Matches AdministrationModule's real FeatureFlagsResponseDto exactly. */
export interface FeatureFlags {
  observabilityEnabled: boolean;
  openApiEnabled: boolean;
  paymentGatewayConfigured: boolean;
  telemedicineConfigured: boolean;
  emailProviderConfigured: boolean;
  notificationQueueConfigured: boolean;
}
