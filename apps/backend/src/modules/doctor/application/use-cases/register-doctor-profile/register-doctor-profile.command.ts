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

export interface RegisterDoctorProfileCommandProps {
  accountId: string;
  licenseNumber: string;
  specialty: string;
  biography?: string;
  yearsOfExperience?: number;
  languages?: string[];
  consultationFeeAmount?: number;
  // Doctor Onboarding (Phase 4 continuation): optional hospital affiliation.
  hospitalId?: string;
  publications?: PortfolioPublicationInput[];
  awards?: PortfolioAwardInput[];
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity's established RegisterAccountCommand style).
export class RegisterDoctorProfileCommand {
  readonly accountId: string;
  readonly licenseNumber: string;
  readonly specialty: string;
  readonly biography?: string;
  readonly yearsOfExperience?: number;
  readonly languages?: string[];
  readonly consultationFeeAmount?: number;
  readonly hospitalId?: string;
  readonly publications?: PortfolioPublicationInput[];
  readonly awards?: PortfolioAwardInput[];

  constructor(props: RegisterDoctorProfileCommandProps) {
    this.accountId = props.accountId;
    this.licenseNumber = props.licenseNumber;
    this.specialty = props.specialty;
    this.biography = props.biography;
    this.yearsOfExperience = props.yearsOfExperience;
    this.languages = props.languages;
    this.consultationFeeAmount = props.consultationFeeAmount;
    this.hospitalId = props.hospitalId;
    this.publications = props.publications;
    this.awards = props.awards;
  }
}
