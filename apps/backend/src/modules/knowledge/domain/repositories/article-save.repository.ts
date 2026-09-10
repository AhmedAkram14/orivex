import type { ArticleSave } from '../entities/article-save.entity.js';

export interface ArticleSaveRepository {
  findByArticleAndPatient(articleId: string, patientId: string): Promise<ArticleSave | null>;
  /** The caller's own saved articles, newest first. */
  listByPatientId(patientId: string): Promise<ArticleSave[]>;
  save(articleSave: ArticleSave): Promise<void>;
  delete(id: string): Promise<void>;
}
