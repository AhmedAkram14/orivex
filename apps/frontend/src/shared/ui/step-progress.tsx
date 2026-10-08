import { cn } from '@/shared/lib/cn';
import { PulseLine } from '@/shared/ui/pulse-line';

export interface StepProgressStep {
  key: string;
  label: string;
}

export interface StepProgressProps {
  steps: readonly StepProgressStep[];
  /** Index of the current step; steps before it read as done. */
  currentIndex: number;
  /** Names the group for assistive tech (e.g. "Booking steps"). */
  label: string;
  /**
   * Makes reachable steps buttons: every step up to `maxReachableIndex` (default: the ones before the current one)
   * except the current step. Omit for a read-only indicator.
   */
  onStepSelect?: (index: number) => void;
  maxReachableIndex?: number;
  /** Below 640px the row of steps becomes this one line (e.g. "Step 3 of 4 · Documents") over the same track. */
  compactLabel?: string;
  className?: string;
}

/**
 * A short flow's progress: numbered steps in one row (done = ink, current = pulse, ahead = muted) over a
 * `PulseLine` progress track. The booking flow's own indicator, shared with the onboarding flows.
 */
export function StepProgress({
  steps,
  currentIndex,
  label,
  onStepSelect,
  maxReachableIndex,
  compactLabel,
  className,
}: StepProgressProps) {
  const reachable = maxReachableIndex ?? currentIndex - 1;

  return (
    <div className={cn('flex flex-col gap-2', className)} role="group" aria-label={label}>
      {compactLabel && (
        <p className="text-small font-semibold text-text-primary sm:hidden">{compactLabel}</p>
      )}
      <ol
        className={cn(
          'flex items-center justify-between gap-2 text-small',
          compactLabel && 'max-sm:hidden',
        )}
      >
        {steps.map((step, index) => {
          const content = (
            <>
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-caption tabular-nums',
                  index < currentIndex && 'bg-text-primary text-text-inverse',
                  index === currentIndex && 'bg-pulse text-pulse-foreground',
                  index > currentIndex && 'bg-surface-2',
                )}
              >
                {index + 1}
              </span>
              {step.label}
            </>
          );
          const selectable = onStepSelect && index !== currentIndex && index <= reachable;
          return (
            <li
              key={step.key}
              aria-current={index === currentIndex ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2',
                index <= currentIndex ? 'font-semibold text-text-primary' : 'text-text-tertiary',
              )}
            >
              {selectable ? (
                <button
                  type="button"
                  onClick={() => onStepSelect(index)}
                  className="-m-1 flex items-center gap-2 rounded-md p-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {content}
                </button>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>
      <PulseLine
        variant="progress"
        progress={steps.length > 1 ? currentIndex / (steps.length - 1) : 1}
      />
    </div>
  );
}
