'use client';

import { useEffect, useState } from 'react';
import { canJoinCall, getJoinWindowOpensAtMs } from '@/shared/lib/consultation/join-window';

export interface JoinCountdownState {
  canJoin: boolean;
  msUntilOpen: number;
}

function computeState(scheduledAt: string): JoinCountdownState {
  const now = new Date();
  const opensAtMs = getJoinWindowOpensAtMs(scheduledAt);
  return {
    canJoin: canJoinCall(scheduledAt, now),
    msUntilOpen: Math.max(0, opensAtMs - now.getTime()),
  };
}

/** Ticks every second so a "time until you can join" countdown stays live without a manual refresh. */
export function useJoinCountdown(scheduledAt: string): JoinCountdownState {
  const [state, setState] = useState(() => computeState(scheduledAt));

  useEffect(() => {
    setState(computeState(scheduledAt));
    const id = setInterval(() => setState(computeState(scheduledAt)), 1000);
    return () => clearInterval(id);
  }, [scheduledAt]);

  return state;
}
