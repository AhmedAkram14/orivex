'use client';

import { useTranslations } from 'next-intl';
import { Logo } from '@/shared/ui/logo';
import { RouteLoadingSkeleton } from '@/shared/ui/layout/route-loading-skeleton';
import { Skeleton } from '@/shared/ui/skeleton';

/**
 * The app shell's silhouette (topbar, sidebar, content), rendered while the
 * session is still resolving -- `RequireAuth`'s loading state. It replaces
 * the full-screen brand splash there: on a hard reload the layout the visitor
 * is about to see is already in place, so nothing jumps when the real shell
 * takes over. The splash (`AppLoadingScreen`) stays for the guest layout's
 * cold start only.
 */
export function ShellSkeleton() {
  const t = useTranslations('common.appLoading');

  return (
    <div role="status" aria-busy="true" aria-live="polite" className="flex h-dvh flex-col overflow-hidden">
      <span className="sr-only">{t('title')}</span>
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border-default bg-surface px-4">
        <Logo size="sm" />
        <Skeleton className="hidden h-5 w-16 sm:block" />
        <div className="ms-auto flex items-center gap-3">
          <Skeleton className="hidden h-9 w-56 sm:block" />
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-9 w-28" />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col gap-2 border-e border-border-default bg-surface p-3 lg:flex">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </aside>
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden bg-canvas">
          <RouteLoadingSkeleton />
        </main>
      </div>
    </div>
  );
}
