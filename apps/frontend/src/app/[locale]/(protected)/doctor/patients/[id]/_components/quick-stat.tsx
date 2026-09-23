import { cn } from '@/shared/lib/cn';

export interface QuickStatProps {
  label: string;
  value: string;
  onClick?: () => void;
}

// P1: stat tiles deep-link into the matching tab instead of being dead
// ends -- `onClick` is optional so a tile with nowhere useful to send the
// doctor (none exist currently, kept for a future tile) can still render as
// plain, non-interactive text.
export function QuickStat({ label, value, onClick }: QuickStatProps) {
  const content = (
    <>
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="text-lg font-semibold text-text-primary">{value}</p>
    </>
  );

  if (!onClick) {
    return <div className="flex flex-col gap-1 rounded-xl border border-border-default/70 bg-surface px-4 py-3">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1 rounded-xl border border-border-default/70 bg-surface px-4 py-3 text-start',
        'transition-colors hover:bg-secondary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
      )}
    >
      {content}
    </button>
  );
}
