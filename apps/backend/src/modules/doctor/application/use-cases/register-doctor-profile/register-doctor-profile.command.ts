export interface PortfolioPublicationInput {
  title: string;
  reference?: string;
  publishedAt?: Date;
}

export interface PortfolioAwardInput {
  title: string;
  issuingBody?: string;
  awardedAt?: Date;
}

export interface PortfolioWorkExperienceInput {
  organizationName: string;
  position: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
}

import type { ProfessionalRank } from '../../../domain/enums/professional-rank.enum.js';

export interface RegisterDoctorProfileCommandProps {
  accountId: string;
  licenseNumber: string;
  biography?: string;
  yearsOfExperience?: number;
  languages?: string[];
  // Doctor Profile Redesign (2026-08-02): plain string list, same shape as
  // `languages` above.
  insuranceProviders?: string[];
  consultationFeeAmount?: number;
  // Doctor Onboarding (Phase 4 continuation): optional hospital affiliation.
  hospitalId?: string;
  publications?: PortfolioPublicationInput[];
  awards?: PortfolioAwardInput[];
  // Doctor Profile Redesign (2026-08-02): work-history timeline backing the
  // Doctor Profile page's "Experience" section.
  workExperience?: PortfolioWorkExperienceInput[];
  // Onboarding Redesign (2026-07-21 proposal, Stage O.9): the sole source of
  // a doctor's specialty, required.
  specialtyId: string;
  professionalRank?: ProfessionalRank;
  licenseExpiryDate?: Date;
  departmentId?: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity's established RegisterAccountCommand style).
export class RegisterDoctorProfileCommand {
  readonly accountId: string;
  readonly licenseNumber: string;
  readonly biography?: string;
  readonly yearsOfExperience?: number;
  readonly languages?: string[];
  readonly insuranceProviders?: string[];
  readonly consultationFeeAmount?: number;
  readonly hospitalId?: string;
  readonly publications?: PortfolioPublicationInput[];
  readonly awards?: PortfolioAwardInput[];
  readonly workExperience?: PortfolioWorkExperienceInput[];
  readonly specialtyId: string;
  readonly professionalRank?: ProfessionalRank;
  readonly licenseExpiryDate?: Date;
  readonly departmentId?: string;

  constructor(props: RegisterDoctorProfileCommandProps) {
    this.accountId = props.accountId;
    this.licenseNumber = props.licenseNumber;
    this.biography = props.biography;
    this.yearsOfExperience = props.yearsOfExperience;
    this.languages = props.languages;
    this.insuranceProviders = props.insuranceProviders;
    this.consultationFeeAmount = props.consultationFeeAmount;
    this.hospitalId = props.hospitalId;
    this.publications = props.publications;
    this.awards = props.awards;
    this.workExperience = props.workExperience;
    this.specialtyId = props.specialtyId;
    this.professionalRank = props.professionalRank;
    this.licenseExpiryDate = props.licenseExpiryDate;
    this.departmentId = props.departmentId;
  }
}
