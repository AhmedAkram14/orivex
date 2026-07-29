export interface ListPublicDoctorsQueryProps {
  page: number;
  limit: number;
  specialtyId?: string;
}

// Queries are application messages, not structural types — immutable by
// construction, matching ListDoctorDirectoryQuery's own established shape.
export class ListPublicDoctorsQuery {
  readonly page: number;
  readonly limit: number;
  readonly specialtyId?: string;

  constructor(props: ListPublicDoctorsQueryProps) {
    this.page = props.page;
    this.limit = props.limit;
    this.specialtyId = props.specialtyId;
  }
}
