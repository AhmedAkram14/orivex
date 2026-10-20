'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * The pages to offer as direct jumps: always the first and last, the current page and its neighbours, and a gap
 * ("ellipsis") wherever pages are skipped -- at most seven entries, so the row never outgrows its line.
 */
export function pageItems(page: number, pageCount: number): Array<number | 'ellipsis'> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((value) => pages.add(value));
  if (page >= pageCount - 2) [pageCount - 3, pageCount - 2, pageCount - 1].forEach((value) => pages.add(value));
  const sorted = [...pages].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const items: Array<number | 'ellipsis'> = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1]! > 1) items.push('ellipsis');
    items.push(value);
  });
  return items;
}

/**
 * Controlled pagination — the caller owns page state (e.g. driven by a query param), consistent with Phase 2's rule
 * that this layer holds no business/fetch logic of its own. Numbered pages to jump to from 640px; a phone keeps the
 * compact "Page x of y" between the arrows.
 */
export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  const t = useTranslations('common.pagination');
  const format = useFormatter();
  const canGoPrevious = page > 1;
  const canGoNext = page < pageCount;

  return (
    <nav aria-label={t('label')} className={cn('flex items-center justify-between gap-4', className)}>
      <Button
        variant="secondary"
        size="sm"
        disabled={!canGoPrevious}
        onClick={() => onPageChange(page - 1)}
        aria-label={t('previousPage')}
      >
        <Icon icon={ChevronLeft} size="sm" flipRtl />
      </Button>
      <span className="text-sm text-text-secondary sm:hidden">{t('pageOf', { page, pageCount })}</span>
      <ol className="flex items-center gap-1 max-sm:hidden">
        {pageItems(page, pageCount).map((item, index) =>
          item === 'ellipsis' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-sm text-text-tertiary">
              …
            </li>
          ) : (
            <li key={item}>
              <Button
                variant={item === page ? 'primary' : 'ghost'}
                size="sm"
                className="min-w-9 tabular-nums"
                aria-current={item === page ? 'page' : undefined}
                aria-label={t('goToPage', { page: item })}
                onClick={() => item !== page && onPageChange(item)}
              >
                {format.number(item)}
              </Button>
            </li>
          ),
        )}
      </ol>
      <Button
        variant="secondary"
        size="sm"
        disabled={!canGoNext}
        onClick={() => onPageChange(page + 1)}
        aria-label={t('nextPage')}
      >
        <Icon icon={ChevronRight} size="sm" flipRtl />
      </Button>
    </nav>
  );
}
