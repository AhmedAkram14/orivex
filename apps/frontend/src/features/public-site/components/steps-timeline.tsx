import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Heading, Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface TimelineStep {
  key: string;
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  /** Optional illustration beside the step (e.g. a product preview card). */
  preview?: ReactNode;
}

export interface StepsTimelineProps {
  steps: readonly TimelineStep[];
  /** `h3` under a section `h2` (default). */
  headingLevel?: 'h3' | 'h4';
  tone?: 'primary' | 'success';
  className?: string;
}

/**
 * A numbered, vertical timeline: an ordered list (so assistive tech announces
 * "step N of M"), each step a numbered marker on a connecting line, its
 * copy, and an optional preview. Logical properties only, so it mirrors in
 * RTL with no extra work.
 */
export function StepsTimeline({ steps, headingLevel = 'h3', tone = 'primary', className }: StepsTimelineProps) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={step.key} className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 sm:gap-x-6">
            {!isLast && <span aria-hidden="true" className="absolute start-5 top-11 bottom-0 w-px -translate-x-1/2 bg-border-default rtl:translate-x-1/2" />}
            <span
              aria-hidden="true"
              className={cn(
                'relative z-10 flex size-10 items-center justify-center rounded-full font-semibold',
                tone === 'primary' ? 'bg-primary-subtle text-primary-emphasis' : 'bg-success-subtle text-success-emphasis',
              )}
            >
              {index + 1}
            </span>
            <div className={cn('flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8', !isLast && 'pb-10')}>
              <div className="flex flex-col gap-2 pt-1.5">
                <Heading as={headingLevel} level={4} className="flex items-center gap-2">
                  <Icon icon={step.icon} size="sm" className={tone === 'primary' ? 'text-primary' : 'text-success'} />
                  {step.title}
                </Heading>
                <Text size="sm" tone="secondary" as="div">
                  {step.description}
                </Text>
              </div>
              {step.preview && <div className="min-w-0">{step.preview}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
