/** Path constants for `/knowledge/*` — mirrors `features/messaging/api/paths.ts`'s convention exactly. Matches KnowledgeController's own real routes. */
export const KNOWLEDGE_PATHS = {
  articles: () => '/knowledge/articles',
  myArticles: () => '/knowledge/articles/mine',
  article: (id: string) => `/knowledge/articles/${id}`,
  editArticle: (id: string) => `/knowledge/articles/${id}`,
  submitArticle: (id: string) => `/knowledge/articles/${id}/submit`,
  unpublishArticle: (id: string) => `/knowledge/articles/${id}/unpublish`,
  saveArticle: (id: string) => `/knowledge/articles/${id}/save`,
  savedArticles: () => '/knowledge/saved-articles',
  followDoctor: (doctorId: string) => `/knowledge/doctors/${doctorId}/follow`,
  followedDoctors: () => '/knowledge/followed-doctors',
} as const;
