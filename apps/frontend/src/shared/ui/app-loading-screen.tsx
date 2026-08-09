import { useTranslations } from 'next-intl';
import { Logo } from '@/shared/ui/logo';

const BAR_COUNT = 6;

export interface AppLoadingScreenProps {
  /** Overrides the primary line while keeping the same branded shell. Defaults to the generic "Preparing your healthcare experience". */
  message?: string;
}

/**
 * The full-viewport, no-shell loading moment — route transitions
 * (`[locale]/loading.tsx`), the session check `RequireAuth` runs before
 * `AppShell` ever mounts, and the guest layout's authenticated-redirect
 * pending state. Deliberately NOT used by `LoadingState` (`RequireRole`,
 * per-page data loads, etc.) — those render inside an already-visible
 * `AppShell`, where a full-brand splash would duplicate the topbar's own
 * logo. Motion is decorative only (aria-hidden) and freezes under
 * `prefers-reduced-motion` (see scales.css).
 */
export function AppLoadingScreen({ message }: AppLoadingScreenProps) {
  const t = useTranslations('common.appLoading');

  return (
    <div role="status" aria-label={message ?? t('title')} className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-canvas px-6 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-72 animate-glow-pulse rounded-full bg-primary-subtle blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-3">
        <Logo size="xl" />
        <span className="text-3xl font-bold text-text-primary">Orivex</span>
      </div>

      <p className="relative text-base text-text-secondary">{message ?? t('title')}</p>

      <div aria-hidden className="relative flex items-end gap-1.5">
        {Array.from({ length: BAR_COUNT }).map((_, index) => (
          <span
            key={index}
            className="h-2.5 w-6 animate-loading-bar rounded-full bg-primary"
            style={{ animationDelay: `${index * 0.12}s` }}
          />
        ))}
      </div>

      <p className="relative text-sm text-text-tertiary">{t('subtitle')}</p>
    </div>
  );
}
