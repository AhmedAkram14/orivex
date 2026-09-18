import type { KnowledgeArticleLanguage } from '../../../domain/enums/knowledge-article-language.enum.js';

export interface ListPublishedArticlesQueryProps {
  page: number;
  limit: number;
  doctorId?: string;
  language?: KnowledgeArticleLanguage;
}

export class ListPublishedArticlesQuery {
  readonly page: number;
  readonly limit: number;
  readonly doctorId?: string;
  readonly language?: KnowledgeArticleLanguage;

  constructor(props: ListPublishedArticlesQueryProps) {
    this.page = props.page;
    this.limit = props.limit;
    this.doctorId = props.doctorId;
    this.language = props.language;
  }
}
