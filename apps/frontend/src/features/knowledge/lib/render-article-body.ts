import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * Knowledge Center Hardening Phase 3, decision 2: article bodies are stored
 * as plain Markdown strings (never HTML) -- only the *render* is
 * Markdown-aware. This is the one function allowed to turn that string into
 * HTML, and its output is only ever consumed via `dangerouslySetInnerHTML`
 * in `article-card.tsx` -- nowhere else.
 *
 * Real user-generated content rendered to *other* users is a genuine XSS
 * surface (a malicious doctor's article body reaching a patient's browser),
 * so `marked.parse()` (called in its synchronous mode explicitly -- it can
 * also run async with a custom extension, which this call site never wants)
 * is always followed by `DOMPurify.sanitize()` before this function returns
 * anything to a caller. See `render-article-body.test.ts` for the actual
 * regression test asserting a `<script>` tag never survives.
 */
export function renderArticleBody(markdown: string): string {
  // DOMPurify needs a real DOM `window` to sanitize against -- absent
  // during Next.js's server render of this ('use client') component tree.
  // Rather than ship unsanitized HTML from the server (a real XSS window
  // before hydration) or pull in a full jsdom just for this, this returns
  // empty markup on the server; `ArticleCard` re-renders with the real
  // sanitized content once mounted client-side (see its own comment).
  if (typeof window === 'undefined') return '';
  const html = marked.parse(markdown, { async: false }) as string;
  return DOMPurify.sanitize(html);
}
