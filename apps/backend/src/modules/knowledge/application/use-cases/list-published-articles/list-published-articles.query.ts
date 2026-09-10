export interface ListPublishedArticlesQueryProps {
  page: number;
  limit: number;
  doctorId?: string;
}

export class ListPublishedArticlesQuery {
  readonly page: number;
  readonly limit: number;
  readonly doctorId?: string;

  constructor(props: ListPublishedArticlesQueryProps) {
    this.page = props.page;
    this.limit = props.limit;
    this.doctorId = props.doctorId;
  }
}
