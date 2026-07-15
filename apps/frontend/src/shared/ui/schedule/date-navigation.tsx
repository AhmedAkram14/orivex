import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';

export interface DateNavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  todayLabel: string;
  previousLabel: string;
  nextLabel: string;
  className?: string;
}

/** Previous/Today/Next controls for any date-ranged view (week, day) — deliberately period-agnostic, so `CalendarHeader` can drive it by week or by day without this component knowing which. */
export function DateNavigation({
  onPrevious,
  onNext,
  onToday,
  todayLabel,
  previousLabel,
  nextLabel,
  className,
}: DateNavigationProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button variant="outline" size="icon" onClick={onPrevious} aria-label={previousLabel}>
        <Icon icon={ChevronLeft} size="sm" flipRtl />
      </Button>
      <Button variant="outline" size="sm" onClick={onToday}>
        {todayLabel}
      </Button>
      <Button variant="outline" size="icon" onClick={onNext} aria-label={nextLabel}>
        <Icon icon={ChevronRight} size="sm" flipRtl />
      </Button>
    </div>
  );
}
