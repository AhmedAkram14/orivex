'use client';

import { Clock } from 'lucide-react';
import { useLocale } from 'next-intl';

import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { useJoinCountdown } from '@/shared/hooks/use-join-countdown';

export interface JoinCountdownProps {
  scheduledAt: string;
  /** Prefix text before the ticking clock, e.g. "Joinable in" -- already translated by the caller, this component owns no copy of its own. */
  label: string;
  className?: string;
}

/** Uses localized day/hour/minute units above 24 hours, then switches to a clock below that. */
function formatCountdown(ms: number, locale: string): string {
  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds > 24 * 60 * 60) {
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const parts: string[] = [];

    if (days > 0) {
      parts.push(new Intl.NumberFormat(locale, { style: 'unit', unit: 'day', unitDisplay: 'long' }).format(days));
    }
    if (hours > 0) {
      parts.push(new Intl.NumberFormat(locale, { style: 'unit', unit: 'hour', unitDisplay: 'long' }).format(hours));
    }
    if (minutes > 0) {
      parts.push(new Intl.NumberFormat(locale, { style: 'unit', unit: 'minute', unitDisplay: 'long' }).format(minutes));
    }

    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(parts);
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * The Join-Window Enforcement countdown -- shown in place of a Join button
 * while the window hasn't opened yet, for both the patient and the doctor
 * (the backend's MintConsultationRoomTokenUseCase gates both roles
 * identically). Renders nothing once the window opens; the caller swaps in
 * the real Join action at that point.
 */
export function JoinCountdown({ scheduledAt, label, className }: JoinCountdownProps) {
  const { canJoin, msUntilOpen } = useJoinCountdown(scheduledAt);
  const locale = useLocale();

  // Nothing to show once the window is open (a real Join action takes
  // over) or once it's already closed (msUntilOpen is clamped to 0 then
  // too, but there's nothing left to count down to).
  if (canJoin || msUntilOpen <= 0) return null;

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-text-tertiary tabular-nums', className)}>
      <Icon icon={Clock} size="xs" />
      {label} {formatCountdown(msUntilOpen, locale)}
    </span>
  );
}
