export interface ListDoctorDirectoryQueryProps {
  page: number;
  limit: number;
  specialty?: string;
  specialtyId?: string;
  hospitalId?: string;
  language?: string;
  gender?: string;
  minFeeAmount?: number;
  maxFeeAmount?: number;
  consultationType?: 'FREE' | 'PAID';
  minYearsOfExperience?: number;
  availableWithinDays?: number;
  minRating?: number;
}

// Queries are application messages, not structural types — immutable by
// construction, matching ListAccountsQuery's own established shape
// (page/limit, not limit/offset -- the use case converts internally).
export class ListDoctorDirectoryQuery {
  readonly page: number;
  readonly limit: number;
  readonly specialty?: string;
  readonly specialtyId?: string;
  readonly hospitalId?: string;
  readonly language?: string;
  readonly gender?: string;
  readonly minFeeAmount?: number;
  readonly maxFeeAmount?: number;
  readonly consultationType?: 'FREE' | 'PAID';
  readonly minYearsOfExperience?: number;
  readonly availableWithinDays?: number;
  readonly minRating?: number;

  constructor(props: ListDoctorDirectoryQueryProps) {
    this.page = props.page;
    this.limit = props.limit;
    this.specialty = props.specialty;
    this.specialtyId = props.specialtyId;
    this.hospitalId = props.hospitalId;
    this.language = props.language;
    this.gender = props.gender;
    this.minFeeAmount = props.minFeeAmount;
    this.maxFeeAmount = props.maxFeeAmount;
    this.consultationType = props.consultationType;
    this.minYearsOfExperience = props.minYearsOfExperience;
    this.availableWithinDays = props.availableWithinDays;
    this.minRating = props.minRating;
  }
}
