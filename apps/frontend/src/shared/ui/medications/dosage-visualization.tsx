import { Pill } from 'lucide-react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

const MAX_VISIBLE_DOSES = 6;

export interface DosageVisualizationProps {
  /** Doses per day — renders one filled pill indicator per dose, capped at 6 with a "+N" overflow marker. */
  dosesPerDay: number;
  /** Accessible label describing the frequency (e.g. "Twice daily") — the visual dots are decorative, this label carries the meaning for screen readers. */
  label: string;
  className?: string;
}

/**
 * A lightweight, real dosage visualization — a row of pill-dot indicators
 * representing how many doses per day a medication requires. Deliberately
 * simple (no chart library): the count itself is the entire signal, and a
 * caller never fabricates a value here since `dosesPerDay` always comes from
 * real (mocked) `Prescription` data.
 */
export function DosageVisualization({ dosesPerDay, label, className }: DosageVisualizationProps) {
  const visibleDoses = Math.min(dosesPerDay, MAX_VISIBLE_DOSES);
  const overflow = dosesPerDay - MAX_VISIBLE_DOSES;

  return (
    <div className={cn('flex items-center gap-1', className)} role="img" aria-label={label}>
      {Array.from({ length: visibleDoses }, (_, index) => (
        <Icon key={index} icon={Pill} size="sm" className="text-primary" />
      ))}
      {overflow > 0 && <span className="text-xs font-medium text-text-tertiary">+{overflow}</span>}
    </div>
  );
}
