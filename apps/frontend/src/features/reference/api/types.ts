/** Matches ReferenceDirectoryController's real MedicalSpecialtyResponseDto exactly. */
export interface MedicalSpecialty {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Onboarding Redesign (2026-07-21 proposal, Stage O.6): matches ReferenceDirectoryController's real CountryResponseDto exactly -- a nationality is a country reference, no separate table. */
export interface Country {
  id: string;
  name: string;
  iso2Code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Onboarding Redesign (2026-07-21 proposal, Stage O.7): matches ReferenceDirectoryController's real InsuranceProviderResponseDto exactly. */
export interface InsuranceProvider {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
