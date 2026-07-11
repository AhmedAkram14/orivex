import type {
  PortfolioAwardInput,
  PortfolioPublicationInput,
} from '../register-doctor-profile/register-doctor-profile.command.js';

export interface UpdateDoctorProfileCommandProps {
  doctorProfileId: string;
  specialty?: string;
  biography?: string;
  yearsOfExperience?: number;
  languages?: string[];
  consultationFeeAmount?: number | null;
  publications?: PortfolioPublicationInput[];
  awards?: PortfolioAwardInput[];
}

export class UpdateDoctorProfileCommand {
  readonly doctorProfileId: string;
  readonly specialty?: string;
  readonly biography?: string;
  readonly yearsOfExperience?: number;
  readonly languages?: string[];
  readonly consultationFeeAmount?: number | null;
  readonly publications?: PortfolioPublicationInput[];
  readonly awards?: PortfolioAwardInput[];

  constructor(props: UpdateDoctorProfileCommandProps) {
    this.doctorProfileId = props.doctorProfileId;
    this.specialty = props.specialty;
    this.biography = props.biography;
    this.yearsOfExperience = props.yearsOfExperience;
    this.languages = props.languages;
    this.consultationFeeAmount = props.consultationFeeAmount;
    this.publications = props.publications;
    this.awards = props.awards;
  }
}
