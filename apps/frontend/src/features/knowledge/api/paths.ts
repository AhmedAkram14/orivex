/** Path constants for `/knowledge/*` — mirrors `features/messaging/api/paths.ts`'s convention exactly. Matches KnowledgeController's own real routes. */
export const KNOWLEDGE_PATHS = {
  articles: () => '/knowledge/articles',
  myArticles: () => '/knowledge/articles/mine',
  article: (id: string) => `/knowledge/articles/${id}`,
  saveArticle: (id: string) => `/knowledge/articles/${id}/save`,
  savedArticles: () => '/knowledge/saved-articles',
  followDoctor: (doctorId: string) => `/knowledge/doctors/${doctorId}/follow`,
  followedDoctors: () => '/knowledge/followed-doctors',
} as const;
