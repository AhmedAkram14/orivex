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

/** Matches TrustModule's real VerificationCaseResponseDto exactly. */
export interface VerificationCase {
  id: string;
  doctorId: string;
  status: VerificationCaseStatus;
  submittedAt: string;
  decidedAt: string | null;
}

export type VerificationDecisionStatus = 'approved' | 'rejected' | 'more_info_needed';

export interface ReviewVerificationCaseRequest {
  status: VerificationDecisionStatus;
  reason?: string;
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
