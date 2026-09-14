'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Controlled pagination — the caller owns page state (e.g. driven by a query param), consistent with Phase 2's rule that this layer holds no business/fetch logic of its own. */
export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  const t = useTranslations('common.pagination');
  const canGoPrevious = page > 1;
  const canGoNext = page < pageCount;

  return (
    <nav aria-label={t('label')} className={cn('flex items-center justify-between gap-4', className)}>
      <Button
        variant="outline"
        size="sm"
        disabled={!canGoPrevious}
        onClick={() => onPageChange(page - 1)}
        aria-label={t('previousPage')}
      >
        <Icon icon={ChevronLeft} size="sm" flipRtl />
      </Button>
      <span className="text-sm text-text-secondary">{t('pageOf', { page, pageCount })}</span>
      <Button
        variant="outline"
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
