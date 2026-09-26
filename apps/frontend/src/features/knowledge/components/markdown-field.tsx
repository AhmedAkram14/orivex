'use client';

import { Bold, Heading2, Italic, Link2, List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type RefObject } from 'react';
import { renderArticleBody } from '@/features/knowledge/lib/render-article-body';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Textarea } from '@/shared/ui/textarea';
import type { ComponentProps } from 'react';

type MarkdownAction = 'bold' | 'italic' | 'heading' | 'list' | 'link';

/** Wraps the current selection (or inserts a placeholder) with Markdown syntax and returns the new value plus the caret range to restore. */
function applyMarkdown(value: string, start: number, end: number, action: MarkdownAction, linkText: string) {
  const selected = value.slice(start, end);
  const wrap = (before: string, after: string, fallback: string) => {
    const inner = selected || fallback;
    return { text: `${before}${inner}${after}`, from: start + before.length, to: start + before.length + inner.length };
  };
  const linePrefix = (prefix: string) => {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    return { text: value.slice(0, lineStart) + prefix + value.slice(lineStart), from: start + prefix.length, to: end + prefix.length, whole: true };
  };
  if (action === 'heading') return linePrefix('## ');
  if (action === 'list') return linePrefix('- ');
  const inserted =
    action === 'bold' ? wrap('**', '**', 'bold') : action === 'italic' ? wrap('_', '_', 'italic') : wrap('[', '](https://)', linkText);
  return { text: value.slice(0, start) + inserted.text + value.slice(end), from: inserted.from, to: inserted.to, whole: true };
}

function useSanitizedHtml(markdown: string): string {
  const [html, setHtml] = useState('');
  useEffect(() => {
    setHtml(renderArticleBody(markdown));
  }, [markdown]);
  return html;
}

export interface MarkdownFieldProps extends Omit<ComponentProps<typeof Textarea>, 'value' | 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  max: number;
}

/**
 * The article body editor: Write / Preview tabs, a Markdown toolbar (bold,
 * italic, heading, list, link -- inserted at the caret, no new dependency) and
 * a thin progress bar instead of a "n/20000" counter. Preview renders through
 * the same sanitising `renderArticleBody` the reader sees.
 */
export function MarkdownField({ value, onValueChange, textareaRef, max, ...textareaProps }: MarkdownFieldProps) {
  const t = useTranslations('knowledgeEditor');
  const html = useSanitizedHtml(value);
  const pct = Math.min(100, (value.length / max) * 100);

  function run(action: MarkdownAction) {
    const el = textareaRef.current;
    if (!el) return;
    const result = applyMarkdown(value, el.selectionStart, el.selectionEnd, action, t('linkText'));
    onValueChange(result.text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.from, result.to);
    });
  }

  const tools: { action: MarkdownAction; icon: typeof Bold; label: string }[] = [
    { action: 'bold', icon: Bold, label: t('bold') },
    { action: 'italic', icon: Italic, label: t('italic') },
    { action: 'heading', icon: Heading2, label: t('heading') },
    { action: 'list', icon: List, label: t('list') },
    { action: 'link', icon: Link2, label: t('link') },
  ];

  return (
    <Tabs defaultValue="write" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="write">{t('write')}</TabsTrigger>
          <TabsTrigger value="preview">{t('preview')}</TabsTrigger>
        </TabsList>
        <div role="toolbar" aria-label={t('toolbarLabel')} className="flex items-center gap-0.5">
          {tools.map((tool) => (
            <Button key={tool.action} type="button" variant="ghost" size="icon" aria-label={tool.label} title={tool.label} onClick={() => run(tool.action)}>
              <Icon icon={tool.icon} size="sm" />
            </Button>
          ))}
        </div>
      </div>

      <TabsContent value="write" className="mt-0">
        <Textarea ref={textareaRef} dir="auto" value={value} onChange={(event) => onValueChange(event.target.value)} maxLength={max} {...textareaProps} />
      </TabsContent>
      <TabsContent value="preview" className="mt-0">
        <div
          dir="auto"
          className="min-h-32 rounded-md border border-border-default bg-surface-2 p-4 text-body text-text-secondary [&_a]:text-care-text [&_a]:underline [&_h1]:text-h3 [&_h2]:text-h3 [&_li]:ms-4 [&_ol]:list-decimal [&_p]:my-1 [&_strong]:font-semibold [&_ul]:list-disc"
          {...(html ? { dangerouslySetInnerHTML: { __html: html } } : {})}
        >
          {html ? undefined : <span className="text-text-tertiary">{t('previewEmpty')}</span>}
        </div>
      </TabsContent>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value.length}
        aria-label={t('progress', { count: value.length, max })}
        className="h-1 w-full overflow-hidden rounded-full bg-surface-2"
      >
        <div className={cn('h-full rounded-full transition-[width] duration-(--duration-base)', pct > 90 ? 'bg-warning' : 'bg-text-primary')} style={{ width: `${pct}%` }} />
      </div>
    </Tabs>
  );
}
