import { Check } from 'lucide-react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface StepperStep {
  key: string;
  label: string;
}

export interface StepperProps {
  steps: readonly StepperStep[];
  currentKey: string;
  className?: string;
}

/**
 * Horizontal numbered-step progress indicator for multi-step wizards
 * (doctor onboarding, patient intake). These wizards are strictly
 * sequential, so a step before the current one is always complete --
 * it renders a checkmark. The current step is filled and its label
 * emphasized; steps after it are outlined and muted.
 */
export function Stepper({ steps, currentKey, className }: StepperProps) {
  const currentIndex = steps.findIndex((step) => step.key === currentKey);

  return (
    <ol className={cn('flex items-start', className)}>
      {steps.map((step, index) => {
        const isComplete = currentIndex >= 0 && index < currentIndex;
        const isCurrent = step.key === currentKey;
        const isLast = index === steps.length - 1;

        return (
          <li key={step.key} className={cn('flex items-center', !isLast && 'flex-1')}>
            <div className="flex flex-col items-center gap-2">
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-(--duration-fast) ease-standard',
                  (isComplete || isCurrent) && 'bg-primary text-primary-foreground',
                  !isComplete && !isCurrent && 'border-2 border-border-default bg-surface text-text-tertiary',
                )}
              >
                {isComplete ? <Icon icon={Check} size="sm" /> : index + 1}
              </span>
              <span
                className={cn(
                  'max-w-24 text-center text-xs text-balance',
                  isCurrent ? 'font-semibold text-text-primary' : 'text-text-tertiary',
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                aria-hidden="true"
                className={cn('mx-2 mt-4 h-0.5 flex-1 rounded-full', isComplete ? 'bg-primary' : 'bg-border-default')}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
