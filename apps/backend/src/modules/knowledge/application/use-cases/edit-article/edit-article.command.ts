import type { KnowledgeArticleLanguage } from '../../../domain/enums/knowledge-article-language.enum.js';

export interface EditArticleProps {
  articleId: string;
  callerAccountId: string;
  title: string;
  body: string;
  language: KnowledgeArticleLanguage;
  sourcesText?: string;
}

export class EditArticleCommand {
  readonly articleId: string;
  readonly callerAccountId: string;
  readonly title: string;
  readonly body: string;
  readonly language: KnowledgeArticleLanguage;
  readonly sourcesText?: string;

  constructor(props: EditArticleProps) {
    this.articleId = props.articleId;
    this.callerAccountId = props.callerAccountId;
    this.title = props.title;
    this.body = props.body;
    this.language = props.language;
    this.sourcesText = props.sourcesText;
  }
}
