import type { ProfessionalRank } from '../../../domain/enums/professional-rank.enum.js';
import type {
  PortfolioAwardInput,
  PortfolioPublicationInput,
} from '../register-doctor-profile/register-doctor-profile.command.js';

export interface UpdateDoctorProfileCommandProps {
  doctorProfileId: string;
  biography?: string;
  yearsOfExperience?: number;
  languages?: string[];
  consultationFeeAmount?: number | null;
  // Doctor Onboarding (Phase 4 continuation): optional hospital affiliation.
  hospitalId?: string | null;
  publications?: PortfolioPublicationInput[];
  awards?: PortfolioAwardInput[];
  // Onboarding Redesign (2026-07-21 proposal, Stage O.9): never nullable --
  // a doctor profile always has a specialty, this only ever changes which.
  specialtyId?: string;
  professionalRank?: ProfessionalRank | null;
  licenseExpiryDate?: Date | null;
  departmentId?: string | null;
}

export class UpdateDoctorProfileCommand {
  readonly doctorProfileId: string;
  readonly biography?: string;
  readonly yearsOfExperience?: number;
  readonly languages?: string[];
  readonly consultationFeeAmount?: number | null;
  readonly hospitalId?: string | null;
  readonly publications?: PortfolioPublicationInput[];
  readonly awards?: PortfolioAwardInput[];
  readonly specialtyId?: string;
  readonly professionalRank?: ProfessionalRank | null;
  readonly licenseExpiryDate?: Date | null;
  readonly departmentId?: string | null;

  constructor(props: UpdateDoctorProfileCommandProps) {
    this.doctorProfileId = props.doctorProfileId;
    this.biography = props.biography;
    this.yearsOfExperience = props.yearsOfExperience;
    this.languages = props.languages;
    this.consultationFeeAmount = props.consultationFeeAmount;
    this.hospitalId = props.hospitalId;
    this.publications = props.publications;
    this.awards = props.awards;
    this.specialtyId = props.specialtyId;
    this.professionalRank = props.professionalRank;
    this.licenseExpiryDate = props.licenseExpiryDate;
    this.departmentId = props.departmentId;
  }
}
