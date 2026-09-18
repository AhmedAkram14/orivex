'use client';

import { Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { renderArticleBody } from '@/features/knowledge/lib/render-article-body';
import type { KnowledgeArticleLanguage } from '@/features/knowledge/api/types';
import { Badge } from '@/shared/ui/badge';
import { Icon } from '@/shared/icons/icon';

/**
 * Knowledge Center Hardening Phase 3, item 5: the one shared rendering of
 * an article's actual content -- used both by the patient feed (a real
 * saved `KnowledgeArticle`, with an id/viewCount) and by the composer's
 * Preview mode (in-progress, possibly-unsaved draft state that has neither).
 * Accepting this minimal shape rather than the full `KnowledgeArticle`
 * keeps Preview honest: it renders exactly the same component a patient
 * would see, not a lookalike.
 */
export interface ArticleCardData {
  title: string;
  body: string;
  language: KnowledgeArticleLanguage;
  sourcesText?: string | null;
  /** Absent in Preview mode -- a draft being composed has never been read. */
  viewCount?: number;
}

export interface ArticleCardProps {
  article: ArticleCardData;
  /** Save/follow buttons etc. are feed-specific actions, not this card's own concern -- the feed wraps this card and renders them itself. */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Renders sanitized Markdown -- see `renderArticleBody`'s own comment for
 * why this returns empty markup until mounted client-side (DOMPurify needs
 * a real DOM `window`, absent during Next.js's server render pass).
 */
function useSanitizedBodyHtml(body: string): string {
  const [html, setHtml] = useState('');
  useEffect(() => {
    setHtml(renderArticleBody(body));
  }, [body]);
  return html;
}

export function ArticleCard({ article, footer, className }: ArticleCardProps) {
  const t = useTranslations('knowledge.patient');
  const bodyHtml = useSanitizedBodyHtml(article.body);

  return (
    <li className={`flex flex-col gap-2 rounded-2xl border border-border-default p-4 ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span dir="auto" className="font-medium text-text-primary">
          {article.title}
        </span>
        <Badge variant="neutral">{t(`languageLabels.${article.language}`)}</Badge>
      </div>

      <div
        dir="auto"
        className="max-w-none text-sm text-text-secondary [&_a]:text-primary [&_a]:underline [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_li]:ms-4 [&_ol]:list-decimal [&_p]:my-1 [&_strong]:font-semibold [&_ul]:list-disc"
        // Sanitized via DOMPurify in `renderArticleBody` -- see that
        // function's own comment. This is the only place its output is
        // ever consumed.
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      {article.sourcesText && (
        <div className="flex flex-col gap-1 rounded-lg bg-secondary-subtle p-3">
          <span className="text-xs font-medium text-text-secondary">{t('sourcesLabel')}</span>
          <p dir="auto" className="whitespace-pre-wrap text-xs text-text-tertiary">
            {article.sourcesText}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-text-tertiary">{t('disclaimer')}</p>
        {typeof article.viewCount === 'number' && (
          <span className="flex shrink-0 items-center gap-1 text-xs text-text-tertiary">
            <Icon icon={Eye} size="sm" />
            {article.viewCount}
          </span>
        )}
      </div>

      {footer}
    </li>
  );
}
