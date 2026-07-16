import { CalendarOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/shared/ui/empty-state';

export interface EmptyCalendarProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** `EmptyState` with a calendar-specific default icon — for a calendar view with no availability configured at all (not merely "nothing on this particular day," which each view already renders inline), so a doctor who hasn't set up any working days yet sees an honest, specific message instead of a grid full of blank cells. */
export function EmptyCalendar({ title, description, action, className }: EmptyCalendarProps) {
  return <EmptyState icon={CalendarOff} title={title} description={description} action={action} className={className} />;
}
