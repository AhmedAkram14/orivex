import { Spinner } from '@/shared/ui/spinner';
import { cn } from '@/shared/lib/cn';

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

/** Section/page-level "this whole area is loading" state — composes Spinner with a message. For content whose final shape is already known, prefer Skeleton instead (Phase 1's loading-pattern rule: skeleton for known shape, this for unknown/whole-section loads). */
export function LoadingState({ label = 'Loading', className }: LoadingStateProps) {
  return (
    <div role="status" className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}>
      <Spinner size="lg" label={label} />
      <p className="text-sm text-text-secondary">{label}…</p>
    </div>
  );
}
