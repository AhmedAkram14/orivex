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
  className?: string;
}

/**
 * A short flow's progress: numbered steps in one row (done = ink, current = pulse, ahead = muted) over a
 * `PulseLine` progress track. The booking flow's own indicator, shared with the patient intake.
 */
export function StepProgress({ steps, currentIndex, label, className }: StepProgressProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)} role="group" aria-label={label}>
      <ol className="flex items-center justify-between gap-2 text-small">
        {steps.map((step, index) => (
          <li
            key={step.key}
            aria-current={index === currentIndex ? 'step' : undefined}
            className={cn(
              'flex items-center gap-2',
              index <= currentIndex ? 'font-semibold text-text-primary' : 'text-text-tertiary',
            )}
          >
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-caption tabular-nums',
                index < currentIndex && 'bg-text-primary text-text-inverse',
                index === currentIndex && 'bg-pulse text-pulse-foreground',
                index > currentIndex && 'bg-surface-2',
              )}
            >
              {index + 1}
            </span>
            {step.label}
          </li>
        ))}
      </ol>
      <PulseLine
        variant="progress"
        progress={steps.length > 1 ? currentIndex / (steps.length - 1) : 1}
      />
    </div>
  );
}
