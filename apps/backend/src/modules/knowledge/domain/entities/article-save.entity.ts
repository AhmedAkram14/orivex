import { randomUUID } from 'node:crypto';

export interface SaveArticleProps {
  articleId: string;
  patientId: string;
}

export interface ReconstituteArticleSaveProps {
  id: string;
  articleId: string;
  patientId: string;
  createdAt: Date;
}

// I13 -- Knowledge Center. A bookmark -- deliberately no content copy
// (never a raw-content export, per the PRD's own "protect authorship"
// rule: saving always points back at the original article).
export class ArticleSave {
  private constructor(
    private readonly id: string,
    private readonly articleId: string,
    private readonly patientId: string,
    private readonly createdAt: Date,
  ) {}

  static save(props: SaveArticleProps): ArticleSave {
    return new ArticleSave(randomUUID(), props.articleId, props.patientId, new Date());
  }

  static reconstitute(props: ReconstituteArticleSaveProps): ArticleSave {
    return new ArticleSave(props.id, props.articleId, props.patientId, props.createdAt);
  }

  getId(): string {
    return this.id;
  }

  getArticleId(): string {
    return this.articleId;
  }

  getPatientId(): string {
    return this.patientId;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
