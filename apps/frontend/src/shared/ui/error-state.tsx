'use client';

import { useTranslations } from 'next-intl';
import { env } from '@/shared/lib/env';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Illustration } from '@/shared/ui/illustrations/illustration';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  /** The failed query's `refetch`. Omit only when there is genuinely nothing to retry. */
  onRetry?: () => void;
  retrying?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** A failed query or chart: what happened in human terms, Retry, and a way to reach support. Never renders a blank card. */
export function ErrorState({ title, description, onRetry, retrying = false, size = 'md', className }: ErrorStateProps) {
  const t = useTranslations('ds.errorState');
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 text-center',
        size === 'sm' ? 'py-4' : size === 'lg' ? 'py-20' : 'py-10',
        className,
      )}
    >
      <Illustration name="connection-error" size={size === 'sm' ? 72 : 120} />
      <div className="flex max-w-prose flex-col gap-1">
        <p className={size === 'sm' ? 'text-small font-semibold text-text-primary' : 'text-h3 text-text-primary'}>{title ?? t('title')}</p>
        <p className={size === 'sm' ? 'text-small text-text-secondary' : 'text-body text-text-secondary'}>{description ?? t('description')}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button type="button" variant="secondary" size="sm" loading={retrying} onClick={onRetry}>
            {t('retry')}
          </Button>
        )}
        <Button asChild variant="link" size="sm">
          <a href={`mailto:${env.supportEmail}`}>{t('support')}</a>
        </Button>
      </div>
    </div>
  );
}
