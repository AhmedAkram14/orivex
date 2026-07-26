export interface ListDoctorDirectoryQueryProps {
  page: number;
  limit: number;
  specialty?: string;
  specialtyId?: string;
  hospitalId?: string;
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

  constructor(props: ListDoctorDirectoryQueryProps) {
    this.page = props.page;
    this.limit = props.limit;
    this.specialty = props.specialty;
    this.specialtyId = props.specialtyId;
    this.hospitalId = props.hospitalId;
  }
}
