'use client';

import { useEffect, useRef, useState } from 'react';
import type { QueueEntry } from '@/features/doctor/api/types';
import { toast } from '@/shared/ui/use-toast';

/**
 * Doctor Workspace Patient Queue -- the page a doctor leaves open while
 * waiting for patients to check in. Before this, a new arrival changed the
 * DOM in total silence: no toast, no sound, no aria-live region, nothing to
 * notice if you looked away for even thirty seconds (and nothing at all for
 * a screen-reader user, ever). Diffs each fresh `useDoctorQueue()` snapshot
 * against the previous one and, for every entry that's newly `waiting` and
 * wasn't there before, fires a toast, a short two-tone chime (Web Audio API
 * -- no audio asset to ship/host), and returns a plain-text announcement for
 * the caller to render inside a visually-hidden `aria-live="polite"` region.
 *
 * The first snapshot after mount is a baseline, never announced -- every
 * entry already in today's queue when the doctor opens the page is not a
 * "new arrival", it's the page loading its real starting state.
 */
export function useQueueArrivalAnnouncer(entries: QueueEntry[] | undefined, messageFor: (name: string) => { title: string; description: string; announcement: string }) {
  const knownIdsRef = useRef<Set<string> | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!entries) return;

    const waitingIds = new Set(entries.filter((entry) => entry.status === 'waiting').map((entry) => entry.id));

    if (knownIdsRef.current === null) {
      knownIdsRef.current = waitingIds;
      return;
    }

    const previouslyKnown = knownIdsRef.current;
    const newArrivals = entries.filter((entry) => entry.status === 'waiting' && !previouslyKnown.has(entry.id));
    knownIdsRef.current = waitingIds;

    if (newArrivals.length === 0) return;

    for (const arrival of newArrivals) {
      const { title, description } = messageFor(arrival.label);
      toast({ title, description, variant: 'success' });
    }

    setAnnouncement(messageFor(newArrivals[0]!.label).announcement);
    playArrivalChime();
    // `entries` is a fresh array/object identity on every real fetch (React
    // Query), so this deliberately re-runs on every query update rather than
    // needing entries.length or another proxy in the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  return announcement;
}

function playArrivalChime(): void {
  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const now = context.currentTime;

    // Two short, quiet tones (an ascending "ding-ding") -- audible enough to
    // notice, not loud enough to startle a doctor mid-consultation elsewhere
    // in the app.
    [660, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      const start = now + index * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.2);
    });

    setTimeout(() => context.close(), 500);
  } catch {
    // Autoplay policies or an unsupported browser must never break the
    // page -- the toast and aria-live announcement still carry the news.
  }
}
