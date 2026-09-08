'use client';

import { Clock } from 'lucide-react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { useJoinCountdown } from '@/shared/hooks/use-join-countdown';

export interface JoinCountdownProps {
  scheduledAt: string;
  /** Prefix text before the ticking clock, e.g. "Joinable in" -- already translated by the caller, this component owns no copy of its own. */
  label: string;
  className?: string;
}

/** "1:59:00" while more than an hour remains, then "59:00" counting down every second once under an hour. */
function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
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

  // Nothing to show once the window is open (a real Join action takes
  // over) or once it's already closed (msUntilOpen is clamped to 0 then
  // too, but there's nothing left to count down to).
  if (canJoin || msUntilOpen <= 0) return null;

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-text-tertiary tabular-nums', className)}>
      <Icon icon={Clock} size="xs" />
      {label} {formatCountdown(msUntilOpen)}
    </span>
  );
}
