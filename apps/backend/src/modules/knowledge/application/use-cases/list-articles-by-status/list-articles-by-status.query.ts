import type { KnowledgeArticleStatus } from '../../../domain/enums/knowledge-article-status.enum.js';

export interface ListArticlesByStatusQueryProps {
  status: KnowledgeArticleStatus;
  page: number;
  limit: number;
}

export class ListArticlesByStatusQuery {
  readonly status: KnowledgeArticleStatus;
  readonly page: number;
  readonly limit: number;

  constructor(props: ListArticlesByStatusQueryProps) {
    this.status = props.status;
    this.page = props.page;
    this.limit = props.limit;
  }
}
